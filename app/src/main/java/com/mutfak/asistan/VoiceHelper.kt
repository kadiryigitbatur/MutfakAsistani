package com.mutfak.asistan

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import java.util.Locale

/** Pişirme modu için: konuşma tanıma (sürekli dinleme) ve adım okuma. */
class VoiceHelper(
    private val context: Context,
    private val onText: (String) -> Unit,
    private val onState: (String) -> Unit
) {
    private var recognizer: SpeechRecognizer? = null
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var wanted = false
    private var langTag = "tr-TR"
    private val handler = Handler(Looper.getMainLooper())

    fun start(lang: String) {
        langTag = if (lang == "tr") "tr-TR" else "en-US"
        if (!SpeechRecognizer.isRecognitionAvailable(context)) { onState("unavailable"); return }
        wanted = true
        if (recognizer == null) {
            recognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                setRecognitionListener(object : RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) { onState("listening") }
                    override fun onResults(results: Bundle?) {
                        val list = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        list?.firstOrNull()?.let { onText(it) }
                        restart(400)
                    }
                    override fun onError(error: Int) {
                        when (error) {
                            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> { wanted = false; onState("unavailable") }
                            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> restart(1200)
                            else -> restart(700) // sessizlik, eşleşme yok, zaman aşımı: dinlemeye devam
                        }
                    }
                    override fun onPartialResults(partialResults: Bundle?) {}
                    override fun onEndOfSpeech() {}
                    override fun onBeginningOfSpeech() {}
                    override fun onRmsChanged(rmsdB: Float) {}
                    override fun onBufferReceived(buffer: ByteArray?) {}
                    override fun onEvent(eventType: Int, params: Bundle?) {}
                })
            }
        }
        listen()
    }

    private fun listen() {
        if (!wanted) return
        val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, langTag)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }
        try { recognizer?.startListening(i) } catch (_: Exception) { onState("unavailable") }
    }

    private fun restart(delay: Long) {
        if (!wanted) return
        handler.postDelayed({ try { recognizer?.cancel() } catch (_: Exception) {}; listen() }, delay)
    }

    fun stop() {
        wanted = false
        handler.removeCallbacksAndMessages(null)
        try { recognizer?.cancel() } catch (_: Exception) {}
        onState("stopped")
    }

    fun speak(text: String, lang: String) {
        val loc = if (lang == "tr") Locale("tr", "TR") else Locale.US
        if (tts == null) {
            tts = TextToSpeech(context) { status ->
                ttsReady = status == TextToSpeech.SUCCESS
                if (ttsReady) { tts?.language = loc; tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "step") }
            }
            return
        }
        if (ttsReady) { tts?.language = loc; tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "step") }
    }

    fun release() {
        stop()
        try { recognizer?.destroy() } catch (_: Exception) {}
        recognizer = null
        tts?.shutdown(); tts = null
    }
}
