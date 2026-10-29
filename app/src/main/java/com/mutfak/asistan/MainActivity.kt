package com.mutfak.asistan

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.graphics.Color
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.graphics.Typeface
import android.view.Gravity
import android.view.View
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.print.PrintAttributes
import android.print.PrintManager
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.Manifest
import android.content.pm.PackageManager
import android.util.Base64
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import java.io.File
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader

class MainActivity : ComponentActivity() {

    private lateinit var web: WebView
    private lateinit var billing: BillingManager
    private lateinit var voice: VoiceHelper
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var cameraUri: Uri? = null

    // Dosya / kamera seçici (fotoğraftan malzeme)
    private val pickImage = registerForActivityResult(androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult()) { res ->
        val cb = fileCallback ?: return@registerForActivityResult
        val data = res.data?.data
        val out = when {
            res.resultCode != RESULT_OK -> null
            data != null -> arrayOf(data)
            cameraUri != null -> arrayOf(cameraUri!!)
            else -> null
        }
        cb.onReceiveValue(out); fileCallback = null
    }
    private val askMic = registerForActivityResult(androidx.activity.result.contract.ActivityResultContracts.RequestPermission()) { ok ->
        if (ok) voice.start(pendingVoiceLang) else js("window.onVoiceState && window.onVoiceState('unavailable')")
    }
    private var pendingVoiceLang = "tr"
    private var pendingRecipeId: String? = null
    private var geoCallback: android.webkit.GeolocationPermissions.Callback? = null
    private var geoOrigin: String? = null
    private val askLocation = registerForActivityResult(androidx.activity.result.contract.ActivityResultContracts.RequestPermission()) { ok ->
        geoCallback?.invoke(geoOrigin, ok, false); geoCallback = null
    }
    private val askNotif = registerForActivityResult(androidx.activity.result.contract.ActivityResultContracts.RequestPermission()) { ok ->
        if (ok) ReminderReceiver.schedule(this) else {
            getSharedPreferences(ReminderReceiver.PREFS, MODE_PRIVATE).edit().putBoolean("on", false).apply()
            js("window.onReminderDenied && window.onReminderDenied()")
        }
    }
    private var pageReady = false
    private val startedAt = SystemClock.uptimeMillis()
    private var intro: View? = null
    private var safeCss = ""

    // Uygulama dosyaları gerçek bir https adresinden sunulur; böylece localStorage ve fetch sorunsuz çalışır
    private val loader by lazy {
        WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen() // sistem açılış ekranı; hemen ardından kendi intromuz gelir
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        // Tam ekran: WebView tüm ekranı kaplar. Kamera çentiği gibi alanlar sayfaya CSS
        // değişkeni olarak bildirilir; arka plan oraya kadar uzanır, yazılar çentiğe girmez.
        val root = FrameLayout(this).apply { setBackgroundColor(Color.parseColor("#EDF2EA")) }
        billing = BillingManager(this,
            onChanged = { v, src -> js("window.onProChanged && window.onProChanged($v, '$src')") },
            onPrice = { p -> js("window.onProPrice && window.onProPrice(${jsStr(p)})") },
            onError = { c -> js("window.onProError && window.onProError('$c')") })
        billing.start()
        voice = VoiceHelper(this,
            onText = { txt -> js("window.onVoice && window.onVoice(${jsStr(txt)})") },
            onState = { st -> js("window.onVoiceState && window.onVoiceState('$st')") })

        web = WebView(this)
        root.addView(web, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        intro = buildIntro()
        root.addView(intro, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        setContentView(root)

        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
            v.setPadding(0, 0, 0, ime.bottom) // sadece klavye açıkken alttan yer aç
            val safe = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val d = resources.displayMetrics.density
            fun px(i: Int) = "${(i / d).toInt()}px"
            safeCss = "var s=document.documentElement.style;" +
                "s.setProperty('--sat','${px(safe.top)}');s.setProperty('--sab','${px(if (ime.bottom > 0) 0 else safe.bottom)}');" +
                "s.setProperty('--sal','${px(safe.left)}');s.setProperty('--sar','${px(safe.right)}');"
            if (pageReady) web.evaluateJavascript(safeCss, null)
            WindowInsetsCompat.CONSUMED
        }
        hideSystemBars()

        web.settings.apply {
            javaScriptEnabled = true
            setGeolocationEnabled(true)
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = false
        }
        web.addJavascriptInterface(Bridge(), "Android")
        web.webChromeClient = object : WebChromeClient() { // alert / confirm / prompt kutuları + dosya seçici + konum
            override fun onGeolocationPermissionsShowPrompt(origin: String, callback: android.webkit.GeolocationPermissions.Callback) {
                if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) callback.invoke(origin, true, false)
                else { geoCallback = callback; geoOrigin = origin; askLocation.launch(Manifest.permission.ACCESS_COARSE_LOCATION) }
            }
            override fun onShowFileChooser(view: WebView, cb: ValueCallback<Array<Uri>>, params: WebChromeClient.FileChooserParams): Boolean {
                fileCallback?.onReceiveValue(null); fileCallback = cb
                val dir = File(cacheDir, "share").apply { mkdirs() }
                val photo = File(dir, "camera_${System.currentTimeMillis()}.jpg")
                cameraUri = FileProvider.getUriForFile(this@MainActivity, "$packageName.files", photo)
                val camera = Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE).putExtra(android.provider.MediaStore.EXTRA_OUTPUT, cameraUri)
                val gallery = Intent(Intent.ACTION_GET_CONTENT).apply { addCategory(Intent.CATEGORY_OPENABLE); type = "image/*" }
                val chooser = Intent.createChooser(gallery, null).putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf<android.os.Parcelable>(camera))
                return try { pickImage.launch(chooser); true } catch (_: ActivityNotFoundException) { fileCallback = null; false }
            }
        }

        web.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                pageReady = true
                if (safeCss.isNotEmpty()) view.evaluateJavascript(safeCss, null)
                // Intro en az 1,5 sn görünür, sonra yumuşakça kaybolur
                val wait = (1500 - (SystemClock.uptimeMillis() - startedAt)).coerceAtLeast(0)
                intro?.postDelayed({
                    intro?.animate()?.alpha(0f)?.setDuration(350)?.withEndAction {
                        (intro?.parent as? ViewGroup)?.removeView(intro); intro = null
                    }?.start()
                }, wait)
            }

            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                loader.shouldInterceptRequest(request.url)

            // Uygulama dışı bağlantılar (YouTube, Google AI Studio) tarayıcıda açılır
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                if (url.host == APP_HOST) return false
                try { startActivity(Intent(Intent.ACTION_VIEW, url)) } catch (_: ActivityNotFoundException) {}
                return true
            }
        }

        pendingRecipeId = intent?.getStringExtra("recipeId")?.takeIf { it.isNotBlank() }
        if (savedInstanceState != null) web.restoreState(savedInstanceState)
        else web.loadUrl("https://$APP_HOST/assets/index.html")

        // Geri tuşu: önce açık pencereyi kapat, yoksa uygulamadan çık
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                web.evaluateJavascript("window.androidBack ? window.androidBack() : false") { result ->
                    if (result != "true") {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                        isEnabled = true
                    }
                }
            }
        })
    }

    // Üst durum çubuğu ve alt gezinme çubuğu gizli; kenardan kaydırınca kısa süre görünürler
    private fun hideSystemBars() {
        val c = WindowCompat.getInsetsController(window, window.decorView)
        c.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        c.hide(WindowInsetsCompat.Type.systemBars())
    }

    // Açılış ekranı: sarı zemin, ortada uygulama simgesi ve adı
    private fun buildIntro(): View {
        val d = resources.displayMetrics.density
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#F2B01E"))
            isClickable = true
            addView(ImageView(context).apply {
                setImageResource(R.drawable.ic_launcher_foreground)
            }, LinearLayout.LayoutParams((220 * d).toInt(), (220 * d).toInt()))
            addView(TextView(context).apply {
                text = getString(R.string.app_name)
                textSize = 32f
                setTypeface(typeface, Typeface.BOLD)
                setTextColor(Color.parseColor("#1F6B45"))
                gravity = Gravity.CENTER
            }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                topMargin = (-28 * d).toInt()
            })
            addView(TextView(context).apply {
                text = "Yapay zekâ destekli tarif yardımcın"
                textSize = 15f
                setTextColor(Color.parseColor("#3D5A47"))
                gravity = Gravity.CENTER
            }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
                topMargin = (6 * d).toInt()
            })
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        val id = intent.getStringExtra("recipeId")?.takeIf { it.isNotBlank() } ?: return
        js("window.openFromNative && window.openFromNative(${jsStr(id)})")
    }

    override fun onDestroy() { if (::voice.isInitialized) voice.release(); super.onDestroy() }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    private fun js(code: String) = runOnUiThread { if (::web.isInitialized) web.evaluateJavascript(code, null) }
    private fun jsStr(s: String) = "'" + s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ") + "'"

    inner class Bridge {
        @JavascriptInterface fun isPro(): Boolean = billing.isPro
        @JavascriptInterface fun getProPrice(): String = billing.price
        @JavascriptInterface fun buyPro() = runOnUiThread { billing.buy(this@MainActivity) }
        @JavascriptInterface fun restorePro() = runOnUiThread { billing.restore() }
        @JavascriptInterface fun refreshPro() = runOnUiThread { billing.start() }

        @JavascriptInterface
        fun shareImage(title: String, dataUrl: String) = runOnUiThread {
            try {
                val bytes = Base64.decode(dataUrl.substringAfter(","), Base64.DEFAULT)
                val dir = File(cacheDir, "share").apply { mkdirs() }
                val f = File(dir, "tarif.png"); f.writeBytes(bytes)
                val uri = FileProvider.getUriForFile(this@MainActivity, "$packageName.files", f)
                val i = Intent(Intent.ACTION_SEND).apply { type = "image/png"; putExtra(Intent.EXTRA_STREAM, uri); putExtra(Intent.EXTRA_SUBJECT, title); addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION) }
                startActivity(Intent.createChooser(i, title))
            } catch (_: Exception) {}
        }

        @JavascriptInterface fun startVoice(lang: String) = runOnUiThread {
            pendingVoiceLang = lang
            if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) voice.start(lang)
            else askMic.launch(Manifest.permission.RECORD_AUDIO)
        }
        @JavascriptInterface fun stopVoice() = runOnUiThread { voice.stop() }
        @JavascriptInterface fun speak(text: String, lang: String) = runOnUiThread { voice.speak(text, lang) }

        @JavascriptInterface fun pendingRecipe(): String { val id = pendingRecipeId ?: ""; pendingRecipeId = null; return id }

        @JavascriptInterface
        fun setWidget(text: String, recipeId: String) = runOnUiThread {
            getSharedPreferences(DinnerWidget.PREFS, MODE_PRIVATE).edit().putString("text", text).putString("recipeId", recipeId).apply()
            DinnerWidget.refreshAll(this@MainActivity)
        }

        @JavascriptInterface
        fun setReminder(on: Boolean, time: String, title: String, body: String, recipeId: String) = runOnUiThread {
            getSharedPreferences(ReminderReceiver.PREFS, MODE_PRIVATE).edit()
                .putBoolean("on", on).putString("time", time).putString("title", title).putString("body", body).putString("recipeId", recipeId).apply()
            ReminderReceiver.ensureChannel(this@MainActivity)
            if (on && Build.VERSION.SDK_INT >= 33 &&
                ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                askNotif.launch(Manifest.permission.POST_NOTIFICATIONS)
            } else ReminderReceiver.schedule(this@MainActivity)
        }

        @JavascriptInterface
        fun share(title: String, text: String) = runOnUiThread {
            val i = Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_SUBJECT, title); putExtra(Intent.EXTRA_TEXT, text) }
            try { startActivity(Intent.createChooser(i, title)) } catch (_: ActivityNotFoundException) {}
        }

        @JavascriptInterface
        fun copy(text: String) {
            val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            cm.setPrimaryClip(ClipData.newPlainText("Mutfak Asistanı", text))
        }

        @JavascriptInterface
        fun keepScreenOn(on: Boolean) = runOnUiThread {
            if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }

        @JavascriptInterface
        fun vibrate() {
            val v: Vibrator = if (Build.VERSION.SDK_INT >= 31)
                (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
            else @Suppress("DEPRECATION") (getSystemService(Context.VIBRATOR_SERVICE) as Vibrator)
            if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 300, 150, 300), -1))
            else @Suppress("DEPRECATION") v.vibrate(longArrayOf(0, 300, 150, 300), -1)
        }

        @JavascriptInterface
        fun print(title: String) = runOnUiThread {
            val pm = getSystemService(Context.PRINT_SERVICE) as PrintManager
            pm.print(title, web.createPrintDocumentAdapter(title), PrintAttributes.Builder().build())
        }
    }

    companion object { private const val APP_HOST = WebViewAssetLoader.DEFAULT_DOMAIN }
}
