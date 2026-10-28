package com.mutfak.asistan

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import java.util.Calendar

/** Günlük "Bugün ne pişirsem?" bildirimi. Metin ve saat SharedPreferences'ta; JS köprüsü günceller. */
class ReminderReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (!p.getBoolean("on", false)) return
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) { schedule(context); return }

        ensureChannel(context)
        val open = PendingIntent.getActivity(context, 0, Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val n = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_notif)
            .setContentTitle(p.getString("title", "Mutfak Asistanı"))
            .setContentText(p.getString("body", ""))
            .setStyle(NotificationCompat.BigTextStyle().bigText(p.getString("body", "")))
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        try { (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(1, n) } catch (_: SecurityException) {}
        schedule(context) // bir sonraki gün
    }

    companion object {
        const val PREFS = "reminder"
        const val CHANNEL = "daily"

        fun ensureChannel(context: Context) {
            if (Build.VERSION.SDK_INT < 26) return
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (nm.getNotificationChannel(CHANNEL) == null)
                nm.createNotificationChannel(NotificationChannel(CHANNEL, "Günlük hatırlatma", NotificationManager.IMPORTANCE_DEFAULT))
        }

        private fun pending(context: Context) = PendingIntent.getBroadcast(context, 7,
            Intent(context, ReminderReceiver::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

        fun schedule(context: Context) {
            val p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            am.cancel(pending(context))
            if (!p.getBoolean("on", false)) return
            val (h, m) = (p.getString("time", "17:00") ?: "17:00").split(":").map { it.toIntOrNull() ?: 0 }
            val cal = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, h); set(Calendar.MINUTE, m); set(Calendar.SECOND, 0)
                if (timeInMillis <= System.currentTimeMillis()) add(Calendar.DAY_OF_YEAR, 1)
            }
            // Tam dakika gerekmiyor; pil dostu, izin istemeyen pencereli alarm
            am.setWindow(AlarmManager.RTC_WAKEUP, cal.timeInMillis, 15 * 60 * 1000L, pending(context))
        }
    }
}
