package com.alertaki

import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AlertAudioModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "AlertAudio"

    private var mediaPlayer: MediaPlayer? = null

    @ReactMethod
    fun startAlertSound() {
        stopAlertSound()
        try {
            val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

            mediaPlayer = MediaPlayer().apply {
                val audioAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
                setAudioAttributes(audioAttributes)
                setDataSource(reactApplicationContext, alarmUri)
                isLooping = true
                prepare()
                start()
            }
        } catch (_: Exception) {
            // Fail silently - alert still shows visually
        }
    }

    @ReactMethod
    fun stopAlertSound() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) it.stop()
                it.release()
            }
        } catch (_: Exception) {
            // Ignore
        }
        mediaPlayer = null
    }
}
