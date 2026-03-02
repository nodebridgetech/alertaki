package com.alertaki

import android.content.Context
import android.hardware.camera2.CameraManager
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TorchModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "Torch"

    private val handler = Handler(Looper.getMainLooper())
    private var strobing = false
    private var torchOn = false

    private val cameraManager: CameraManager by lazy {
        reactApplicationContext.getSystemService(Context.CAMERA_SERVICE) as CameraManager
    }

    private val strobeRunnable = object : Runnable {
        override fun run() {
            if (!strobing) return
            try {
                torchOn = !torchOn
                val cameraId = cameraManager.cameraIdList[0]
                cameraManager.setTorchMode(cameraId, torchOn)
            } catch (_: Exception) {
                // Device may not have flashlight
            }
            handler.postDelayed(this, 500)
        }
    }

    @ReactMethod
    fun startStrobe() {
        if (strobing) return
        strobing = true
        handler.post(strobeRunnable)
    }

    @ReactMethod
    fun stopStrobe() {
        strobing = false
        handler.removeCallbacks(strobeRunnable)
        try {
            val cameraId = cameraManager.cameraIdList[0]
            cameraManager.setTorchMode(cameraId, false)
        } catch (_: Exception) {
            // Ignore
        }
        torchOn = false
    }
}
