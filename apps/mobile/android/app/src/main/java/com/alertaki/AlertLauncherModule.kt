package com.alertaki

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap

class AlertLauncherModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "AlertLauncher"

    companion object {
        // Static storage for pending alert data (consumed by JS via getPendingAlert)
        @Volatile
        var pendingAlertData: WritableMap? = null
    }

    @ReactMethod
    fun launchAlert(data: ReadableMap) {
        val context = reactApplicationContext

        // Store alert data so JS can retrieve it when app comes to foreground
        pendingAlertData = Arguments.createMap().apply {
            putString("alertId", data.getString("alertId") ?: "")
            putString("type", data.getString("type") ?: "")
            putString("userId", data.getString("userId") ?: "")
            putString("userName", data.getString("userName") ?: "")
            putString("userPhotoURL", data.getString("userPhotoURL") ?: "")
            putString("lat", data.getString("lat") ?: "")
            putString("lng", data.getString("lng") ?: "")
            putString("address", data.getString("address") ?: "")
            putString("customMessage", data.getString("customMessage") ?: "")
            putString("fullscreen", "1")
        }

        // Wake up the screen if it's off
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        if (!pm.isInteractive) {
            @Suppress("DEPRECATION")
            val wakeLock = pm.newWakeLock(
                PowerManager.FULL_WAKE_LOCK or
                PowerManager.ACQUIRE_CAUSES_WAKEUP or
                PowerManager.ON_AFTER_RELEASE,
                "alertaki:alert_wake"
            )
            wakeLock.acquire(5000L)
        }

        val intent = Intent(context, MainActivity::class.java).apply {
            action = "com.alertaki.ALERT_OVERLAY"
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            )
        }

        context.startActivity(intent)
    }

    @ReactMethod
    fun getPendingAlert(promise: Promise) {
        val data = pendingAlertData
        pendingAlertData = null
        if (data != null) {
            promise.resolve(data)
        } else {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun canDrawOverlays(promise: Promise) {
        promise.resolve(Settings.canDrawOverlays(reactApplicationContext))
    }

    @ReactMethod
    fun openOverlaySettings() {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${reactApplicationContext.packageName}")
        ).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        reactApplicationContext.startActivity(intent)
    }
}
