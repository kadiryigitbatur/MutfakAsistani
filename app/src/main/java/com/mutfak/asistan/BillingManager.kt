package com.mutfak.asistan

import android.app.Activity
import android.content.Context
import android.util.Log
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams

/**
 * Google Play üzerinden tek seferlik "Pro" satın alımı.
 *
 * Play Console'da ürün kimliği PRODUCT_ID olan bir "uygulama içi ürün" (tek seferlik) tanımlanmalı.
 * Durum SharedPreferences'ta saklanır; böylece çevrimdışıyken de Pro açık kalır.
 */
class BillingManager(
    private val context: Context,
    private val onChanged: (isPro: Boolean, source: String) -> Unit,
    private val onPrice: (String) -> Unit,
    private val onError: (code: String) -> Unit
) : PurchasesUpdatedListener {

    companion object {
        const val PRODUCT_ID = "pro_lifetime"
        private const val TAG = "Billing"
        private const val PREFS = "pro"
    }

    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private var client: BillingClient = BillingClient.newBuilder(context)
        .setListener(this)
        .enablePendingPurchases()
        .build()
    private var details: ProductDetails? = null
    private var pendingAction: (() -> Unit)? = null

    val isPro: Boolean get() = prefs.getBoolean("pro", false)
    val price: String get() = prefs.getString("price", "") ?: ""

    fun start() = connect { queryPurchases("startup"); queryDetails() }

    fun buy(activity: Activity) = connect {
        val d = details
        if (d == null) { queryDetails { launch(activity) } } else launch(activity)
    }

    fun restore() = connect { queryPurchases("restore", reportMissing = true) }

    private fun connect(action: () -> Unit) {
        if (client.isReady) { action(); return }
        pendingAction = action
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    pendingAction?.invoke(); pendingAction = null
                } else {
                    Log.w(TAG, "setup failed: ${result.debugMessage}")
                    onError("unavailable")
                }
            }
            override fun onBillingServiceDisconnected() { /* bir sonraki çağrıda yeniden bağlanır */ }
        })
    }

    private fun queryDetails(then: (() -> Unit)? = null) {
        val params = QueryProductDetailsParams.newBuilder().setProductList(
            listOf(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(PRODUCT_ID)
                .setProductType(BillingClient.ProductType.INAPP)
                .build())
        ).build()
        client.queryProductDetailsAsync(params) { result, list ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK && list.isNotEmpty()) {
                details = list[0]
                val p = list[0].oneTimePurchaseOfferDetails?.formattedPrice ?: ""
                prefs.edit().putString("price", p).apply()
                onPrice(p)
                then?.invoke()
            } else {
                Log.w(TAG, "no product details: ${result.debugMessage}")
                if (then != null) onError("unavailable")
            }
        }
    }

    private fun launch(activity: Activity) {
        val d = details ?: return onError("unavailable")
        val params = BillingFlowParams.newBuilder().setProductDetailsParamsList(
            listOf(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(d).build())
        ).build()
        val r = client.launchBillingFlow(activity, params)
        if (r.responseCode != BillingClient.BillingResponseCode.OK) onError("unavailable")
    }

    private fun queryPurchases(source: String, reportMissing: Boolean = false) {
        val params = QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()
        client.queryPurchasesAsync(params) { result, purchases ->
            if (result.responseCode != BillingClient.BillingResponseCode.OK) { if (reportMissing) onError("unavailable"); return@queryPurchasesAsync }
            val owned = purchases.any { it.products.contains(PRODUCT_ID) && it.purchaseState == Purchase.PurchaseState.PURCHASED }
            purchases.forEach { handle(it, source) }
            if (!owned) {
                if (isPro && source == "startup") { /* Play'de görünmüyorsa yine de yerel bayrağa dokunma: iade vb. durumları Play Console'dan yönetirsin */ }
                if (reportMissing) onError("none")
            }
        }
    }

    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> purchases?.forEach { handle(it, "purchase") }
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> queryPurchases("restore")
            BillingClient.BillingResponseCode.USER_CANCELED -> { /* sessiz */ }
            else -> onError("unavailable")
        }
    }

    private fun handle(p: Purchase, source: String) {
        if (!p.products.contains(PRODUCT_ID) || p.purchaseState != Purchase.PurchaseState.PURCHASED) return
        if (!p.isAcknowledged) {
            client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.purchaseToken).build()) { }
        }
        if (!isPro || source != "startup") {
            prefs.edit().putBoolean("pro", true).apply()
            onChanged(true, source)
        }
    }
}
