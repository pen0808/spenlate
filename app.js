// Spenlate Application Logic

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Icons
    lucide.createIcons();

    // 2. DOM Elements
    const themeToggleBtn = document.getElementById('theme-toggle');
    const speechLangSelect = document.getElementById('speech-lang-select');
    const targetLangSelect = document.getElementById('target-lang-select');
    
    const speechTextarea = document.getElementById('speech-text');
    const translatedTextarea = document.getElementById('translated-text');
    
    const speechStatus = document.getElementById('speech-status');
    const transStatus = document.getElementById('translation-status');
    
    const recordBtn = document.getElementById('record-btn');
    const translateBtn = document.getElementById('translate-btn');
    const translationLoader = document.getElementById('translation-loader');
    const waveform = document.getElementById('waveform');

    // Utility Button Elements
    const speakSpeechBtn = document.getElementById('speak-speech-btn');
    const copySpeechBtn = document.getElementById('copy-speech-btn');
    const downloadSpeechBtn = document.getElementById('download-speech-btn');
    const clearSpeechBtn = document.getElementById('clear-speech-btn');

    const speakTransBtn = document.getElementById('speak-translation-btn');
    const copyTransBtn = document.getElementById('copy-translation-btn');
    const downloadTransBtn = document.getElementById('download-translation-btn');

    // Stats Elements
    const speechWordCount = document.getElementById('speech-word-count');
    const speechCharCount = document.getElementById('speech-char-count');
    const transWordCount = document.getElementById('trans-word-count');
    const transCharCount = document.getElementById('trans-char-count');

    // 3. Application State
    let isRecording = false;
    let shouldRecord = false; // flag to persist continuous recording through auto-ends
    let baseText = ''; // Stores content before the current speech recognition session
    let finalTranscript = '';
    let speechRecognitionInstance = null;
    let speakingButton = null;

    // 4. Initialize Theme
    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    };
    initTheme();

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // 5. Initialize Web Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        // Handle lack of browser support
        setSpeechStatus('ready');
        recordBtn.disabled = true;
        recordBtn.title = 'Speech recognition not supported in this browser';
        speechTextarea.placeholder = 'Speech recognition is not supported in this browser. Please use a modern browser like Google Chrome or Microsoft Edge.';
        
        const badgeText = speechStatus.querySelector('.status-text');
        badgeText.textContent = 'Unsupported';
        speechStatus.className = 'status-badge status-ready';
        speechStatus.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        speechStatus.style.color = 'var(--danger-color)';
    } else {
        speechRecognitionInstance = new SpeechRecognition();
        speechRecognitionInstance.continuous = true;
        speechRecognitionInstance.interimResults = true;

        // Speech Events
        speechRecognitionInstance.onstart = () => {
            isRecording = true;
            setSpeechStatus('recording');
            updateRecordButtonUI(true);
            waveform.classList.remove('hidden');
        };

        speechRecognitionInstance.onresult = (event) => {
            let interimTranscript = '';
            let newFinalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    newFinalTranscript += event.results[i][0].transcript + ' ';
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            finalTranscript += newFinalTranscript;
            
            // Combine previously saved text with new final & interim speech
            speechTextarea.value = baseText + (baseText && !baseText.endsWith(' ') ? ' ' : '') + finalTranscript + interimTranscript;
            updateStats('speech');
        };

        speechRecognitionInstance.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                alert('Microphone access blocked. Please enable microphone permissions in your browser settings to record.');
                stopRecordingSession();
            }
        };

        speechRecognitionInstance.onend = () => {
            isRecording = false;
            // If the user did not click stop, automatically restart the microphone to prevent cut-off
            if (shouldRecord) {
                try {
                    speechRecognitionInstance.start();
                } catch (e) {
                    console.error('Restart failed:', e);
                }
            } else {
                setSpeechStatus('ready');
                updateRecordButtonUI(false);
                waveform.classList.add('hidden');
            }
        };
    }

    // Toggle speech recognition session
    const startRecordingSession = () => {
        if (!speechRecognitionInstance) return;
        
        // Stop active Text-to-Speech
        cancelSpeechSynthesis();

        baseText = speechTextarea.value;
        finalTranscript = '';
        shouldRecord = true;
        
        // Update recognition lang
        speechRecognitionInstance.lang = speechLangSelect.value;
        
        try {
            speechRecognitionInstance.start();
        } catch (e) {
            console.error('Start recognition error:', e);
        }
    };

    const stopRecordingSession = () => {
        if (!speechRecognitionInstance) return;
        shouldRecord = false;
        speechRecognitionInstance.stop();
        baseText = speechTextarea.value;
        finalTranscript = '';
    };

    recordBtn.addEventListener('click', () => {
        if (isRecording) {
            stopRecordingSession();
        } else {
            startRecordingSession();
        }
    });

    // Update baseText and reset recognition transcript if the user types manually
    speechTextarea.addEventListener('input', () => {
        if (isRecording) {
            baseText = speechTextarea.value;
            finalTranscript = '';
        }
        updateStats('speech');
    });

    translatedTextarea.addEventListener('input', () => {
        updateStats('trans');
    });

    // 6. Visual UI Updates
    function setSpeechStatus(state) {
        const textSpan = speechStatus.querySelector('.status-text');
        
        if (state === 'recording') {
            speechStatus.className = 'status-badge status-recording';
            textSpan.textContent = 'Listening...';
        } else {
            speechStatus.className = 'status-badge status-ready';
            textSpan.textContent = 'Ready';
        }
    }

    function setTranslationStatus(state, message = 'Ready') {
        const textSpan = transStatus.querySelector('.status-text');
        
        if (state === 'translating') {
            transStatus.className = 'status-badge status-recording';
            transStatus.style.borderColor = 'rgba(245, 158, 11, 0.2)';
            transStatus.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
            transStatus.style.color = 'var(--warning-color)';
            textSpan.textContent = message;
        } else if (state === 'success') {
            transStatus.className = 'status-badge status-success';
            transStatus.style.borderColor = '';
            transStatus.style.backgroundColor = '';
            transStatus.style.color = '';
            textSpan.textContent = message;
        } else {
            transStatus.className = 'status-badge status-ready';
            transStatus.style.borderColor = '';
            transStatus.style.backgroundColor = '';
            transStatus.style.color = '';
            textSpan.textContent = message;
        }
    }

    function updateRecordButtonUI(active) {
        const textSpan = recordBtn.querySelector('.record-btn-text');
        const micIcon = recordBtn.querySelector('.icon-mic');
        const stopIcon = recordBtn.querySelector('.icon-stop');

        if (active) {
            recordBtn.classList.add('recording');
            recordBtn.title = 'Stop Recording';
            textSpan.textContent = 'Stop';
            micIcon.classList.add('hidden');
            stopIcon.classList.remove('hidden');
        } else {
            recordBtn.classList.remove('recording');
            recordBtn.title = 'Start Recording';
            textSpan.textContent = 'Record';
            micIcon.classList.remove('hidden');
            stopIcon.classList.add('hidden');
        }
    }

    // 7. Text Stats Counter
    function updateStats(panel) {
        if (panel === 'speech') {
            const text = speechTextarea.value;
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            const chars = text.length;
            
            speechWordCount.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
            speechCharCount.textContent = `${chars} ${chars === 1 ? 'character' : 'characters'}`;
        } else if (panel === 'trans') {
            const text = translatedTextarea.value;
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            const chars = text.length;
            
            transWordCount.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
            transCharCount.textContent = `${chars} ${chars === 1 ? 'character' : 'characters'}`;
            
            // Toggle translate actions disability
            const hasText = text.trim().length > 0;
            speakTransBtn.disabled = !hasText;
            copyTransBtn.disabled = !hasText;
            downloadTransBtn.disabled = !hasText;
        }
    }

    // 8. Translation Logic
    function chunkText(text, maxLength) {
        // Match sentence endings like '.', '!', '?'
        const sentences = text.match(/[^.!?\n]+[.!?\n]+(\s|$)/g) || [text];
        const chunks = [];
        let currentChunk = '';
        
        for (const sentence of sentences) {
            if ((currentChunk + sentence).length > maxLength) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                }
                currentChunk = sentence;
            } else {
                currentChunk += sentence;
            }
        }
        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }
        return chunks;
    }

    async function translateText(text, sourceLang, targetLang) {
        if (!text.trim()) return '';
        
        // MyMemory requires 2 letter codes (e.g. 'en', 'es', 'fr')
        const src = sourceLang.split('-')[0];
        const tgt = targetLang;
        
        // Chunk into safe lengths of under 800 characters to prevent API size limit rejections
        const chunks = chunkText(text, 800);
        const translatedChunks = [];
        
        for (const chunk of chunks) {
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${src}|${tgt}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`API error: status ${response.status}`);
            }
            
            const data = await response.json();
            if (data.responseStatus === 200) {
                translatedChunks.push(data.responseData.translatedText);
            } else {
                throw new Error(data.responseDetails || 'MyMemory translation service failed.');
            }
        }
        
        return translatedChunks.join(' ');
    }

    translateBtn.addEventListener('click', async () => {
        const text = speechTextarea.value;
        if (!text.trim()) {
            alert('Please record or type some text first before translating.');
            return;
        }

        const sourceLang = speechLangSelect.value;
        const targetLang = targetLangSelect.value;
        
        // Prevent translating to the same basic language
        if (sourceLang.split('-')[0] === targetLang) {
            alert('Source language and target language are the same. Please choose a different target language.');
            return;
        }

        try {
            translationLoader.classList.remove('hidden');
            setTranslationStatus('translating', 'Translating...');
            translateBtn.disabled = true;

            const result = await translateText(text, sourceLang, targetLang);
            translatedTextarea.value = result;
            
            setTranslationStatus('success', 'Translated');
            updateStats('trans');
        } catch (error) {
            console.error('Translation error:', error);
            alert('Translation failed. Please check your internet connection or try again later. Detail: ' + error.message);
            setTranslationStatus('ready', 'Failed');
        } finally {
            translationLoader.classList.add('hidden');
            translateBtn.disabled = false;
        }
    });

    // 9. Clipboard Copy
    const copyToClipboard = async (text, button) => {
        if (!text.trim()) return;
        
        try {
            await navigator.clipboard.writeText(text);
            
            // Success Feedback Animation
            button.classList.add('success-action');
            button.innerHTML = '<i data-lucide="check"></i>';
            lucide.createIcons();
            
            setTimeout(() => {
                button.classList.remove('success-action');
                button.innerHTML = '<i data-lucide="copy"></i>';
                lucide.createIcons();
            }, 2000);
        } catch (e) {
            console.error('Copy failed:', e);
            alert('Failed to copy text. Please select and copy manually.');
        }
    };

    copySpeechBtn.addEventListener('click', () => {
        copyToClipboard(speechTextarea.value, copySpeechBtn);
    });

    copyTransBtn.addEventListener('click', () => {
        copyToClipboard(translatedTextarea.value, copyTransBtn);
    });

    // 10. File Downloads
    const downloadTextFile = (text, typeLabel) => {
        if (!text.trim()) return;
        
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const date = new Date();
        const timestamp = date.getFullYear() +
            String(date.getMonth() + 1).padStart(2, '0') +
            String(date.getDate()).padStart(2, '0') + '_' +
            String(date.getHours()).padStart(2, '0') +
            String(date.getMinutes()).padStart(2, '0');
            
        const link = document.createElement('a');
        link.href = url;
        link.download = `spenlate_${typeLabel}_${timestamp}.txt`;
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    downloadSpeechBtn.addEventListener('click', () => {
        downloadTextFile(speechTextarea.value, 'transcription');
    });

    downloadTransBtn.addEventListener('click', () => {
        downloadTextFile(translatedTextarea.value, 'translation');
    });

    // 11. Clear Action
    clearSpeechBtn.addEventListener('click', () => {
        if (!speechTextarea.value.trim()) return;
        
        if (confirm('Are you sure you want to clear the entire transcription?')) {
            cancelSpeechSynthesis();
            
            speechTextarea.value = '';
            baseText = '';
            finalTranscript = '';
            updateStats('speech');
            
            // Also stop recording if active
            if (isRecording) {
                stopRecordingSession();
            }
        }
    });

    // 12. Text-to-Speech (Playback)
    const cancelSpeechSynthesis = () => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        if (speakingButton) {
            resetSpeakButtonUI(speakingButton);
            speakingButton = null;
        }
    };

    const resetSpeakButtonUI = (btn) => {
        btn.classList.remove('success-action');
        btn.innerHTML = '<i data-lucide="volume-2"></i>';
        lucide.createIcons();
        btn.title = btn === speakSpeechBtn ? 'Speak Text (Text-to-Speech)' : 'Speak Translation (Text-to-Speech)';
    };

    const setSpeakButtonActiveUI = (btn) => {
        btn.classList.add('success-action');
        btn.innerHTML = '<i data-lucide="square"></i>';
        lucide.createIcons();
        btn.title = 'Stop Playback';
    };

    const speak = (text, langCode, button) => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            
            // If clicking the button currently playing, we just toggle off/cancel
            if (speakingButton === button) {
                resetSpeakButtonUI(button);
                speakingButton = null;
                return;
            }
            
            // If clicking a different button, reset the old button first
            if (speakingButton) {
                resetSpeakButtonUI(speakingButton);
            }
        }

        if (!text.trim()) return;

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Retrieve voices
        const voices = window.speechSynthesis.getVoices();
        
        // Find a matching voice. Speechlang uses 5 letters (en-US), targetlang uses 2 letters (en)
        let matchedVoice = voices.find(v => v.lang.toLowerCase() === langCode.toLowerCase()) ||
                           voices.find(v => v.lang.toLowerCase().startsWith(langCode.toLowerCase().split('-')[0])) ||
                           voices.find(v => v.default);
        
        if (matchedVoice) {
            utterance.voice = matchedVoice;
        }
        
        utterance.lang = langCode;
        speakingButton = button;
        setSpeakButtonActiveUI(button);

        utterance.onend = () => {
            resetSpeakButtonUI(button);
            if (speakingButton === button) {
                speakingButton = null;
            }
        };

        utterance.onerror = (e) => {
            console.error('SpeechSynthesis error:', e);
            resetSpeakButtonUI(button);
            if (speakingButton === button) {
                speakingButton = null;
            }
        };

        window.speechSynthesis.speak(utterance);
    };

    // Chrome load voices hack
    if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.getVoices();
            };
        }
    }

    speakSpeechBtn.addEventListener('click', () => {
        speak(speechTextarea.value, speechLangSelect.value, speakSpeechBtn);
    });

    speakTransBtn.addEventListener('click', () => {
        speak(translatedTextarea.value, targetLangSelect.value, speakTransBtn);
    });

    // Cancel speech playbacks on page unload
    window.addEventListener('beforeunload', () => {
        cancelSpeechSynthesis();
    });
});
