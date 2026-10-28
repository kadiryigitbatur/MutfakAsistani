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
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = false
        }
        web.addJavascriptInterface(Bridge(), "Android")

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
