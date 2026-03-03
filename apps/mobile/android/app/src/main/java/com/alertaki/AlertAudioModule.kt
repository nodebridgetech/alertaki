package com.alertaki

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AlertAudioModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "AlertAudio"

    private var mediaPlayer: MediaPlayer? = null
    private var previousVolume: Int = -1

    @ReactMethod
    fun startAlertSound() {
        stopAlertSound()
        try {
            val ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

            // Force alarm stream volume to maximum
            val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            previousVolume = audioManager.getStreamVolume(AudioManager.STREAM_ALARM)
            val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0)

            mediaPlayer = MediaPlayer().apply {
                val audioAttributes = AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
                setAudioAttributes(audioAttributes)
                setDataSource(reactApplicationContext, ringtoneUri)
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

        // Restore previous volume
        if (previousVolume >= 0) {
            try {
                val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, previousVolume, 0)
            } catch (_: Exception) {
                // Ignore
            }
            previousVolume = -1
        }
    }
}
