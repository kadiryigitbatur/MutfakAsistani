package com.mutfak.asistan

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/** Ana ekran widget'ı: "Bugün ne pişirsem?" + dolaba göre öneri. Metin JS köprüsünden gelir. */
class DinnerWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { update(context, manager, it) }
    }

    companion object {
        const val PREFS = "widget"

        fun refreshAll(context: Context) {
            val m = AppWidgetManager.getInstance(context)
            val ids = m.getAppWidgetIds(ComponentName(context, DinnerWidget::class.java))
            ids.forEach { update(context, m, it) }
        }

        private fun update(context: Context, manager: AppWidgetManager, id: Int) {
            val p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val text = p.getString("text", null) ?: context.getString(R.string.widget_default)
            val recipeId = p.getString("recipeId", "") ?: ""
            val open = Intent(context, MainActivity::class.java).apply {
                putExtra("recipeId", recipeId)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            val pi = PendingIntent.getActivity(context, 11, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            val views = RemoteViews(context.packageName, R.layout.widget_dinner).apply {
                setTextViewText(R.id.w_text, text)
                setOnClickPendingIntent(R.id.w_root, pi)
            }
            manager.updateAppWidget(id, views)
        }
    }
}
