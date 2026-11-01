package com.mutfak.asistan

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.location.Address
import android.location.Geocoder
import android.location.Location
import android.location.LocationManager
import android.os.Handler
import android.os.Looper
import androidx.core.location.LocationManagerCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import java.util.Locale

/**
 * Hassas konum (Google Play hizmetleri) + ilçe/il (Android adres servisi).
 * Sonuç: onResult(lat, lng, doğruluk_metre, ilçe, il) — ilçe/il boş gelebilir, o zaman JS tarafı yedeğe geçer.
 */
class LocationHelper(
    private val activity: Activity,
    private val onResult: (Double, Double, Float, String, String) -> Unit,
    private val onError: (String) -> Unit
) {
    private val client = LocationServices.getFusedLocationProviderClient(activity)
    private val main = Handler(Looper.getMainLooper())

    fun servicesOn(): Boolean {
        val lm = activity.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        return LocationManagerCompat.isLocationEnabled(lm)
    }

    @SuppressLint("MissingPermission")
    fun locate(lang: String) {
        if (!servicesOn()) { onError("off"); return }
        val cts = CancellationTokenSource()
        var done = false
        val finish: (Location?) -> Unit = { loc ->
            if (!done) {
                done = true
                if (loc == null) onError("none") else geocode(loc, lang)
            }
        }
        // 25 sn içinde taze konum gelmezse son bilinen konumu kullan
        main.postDelayed({
            if (!done) {
                cts.cancel()
                client.lastLocation.addOnSuccessListener { finish(it) }.addOnFailureListener { finish(null) }
            }
        }, 25000)
        client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cts.token)
            .addOnSuccessListener { loc ->
                if (loc != null) finish(loc)
                else client.lastLocation.addOnSuccessListener { finish(it) }.addOnFailureListener { finish(null) }
            }
            .addOnFailureListener {
                client.lastLocation.addOnSuccessListener { finish(it) }.addOnFailureListener { finish(null) }
            }
    }

    private fun clean(s: String?): String =
        (s ?: "").replace(Regex("\\s+(İlçesi|ilçesi|District|Merkez)$"), "").trim()

    private fun geocode(loc: Location, lang: String) {
        Thread {
            var district = ""
            var city = ""
            try {
                if (Geocoder.isPresent()) {
                    val locale = if (lang == "tr") Locale("tr", "TR") else Locale.getDefault()
                    @Suppress("DEPRECATION")
                    val a: Address? = Geocoder(activity, locale).getFromLocation(loc.latitude, loc.longitude, 1)?.firstOrNull()
                    if (a != null) {
                        city = clean(a.adminArea)
                        // Türkiye'de ilçe çoğunlukla subAdminArea'dadır; bazı cihazlarda subLocality ya da locality'de gelir
                        district = listOf(a.subAdminArea, a.subLocality, a.locality)
                            .map { clean(it) }
                            .firstOrNull { it.isNotEmpty() && !it.equals(city, ignoreCase = true) } ?: ""
                    }
                }
            } catch (_: Exception) { /* adres servisi yoksa JS yedeği devreye girer */ }
            main.post { onResult(loc.latitude, loc.longitude, loc.accuracy, district, city) }
        }.start()
    }
}
