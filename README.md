# MP3 Audio Transcription Service

A simple, efficient service for transcribing MP3 audio files to text. The system utilizes Huggingface API and OpenAI's Whisper-large-v3 model to provide accurate transcriptions.

## Features

- **MP3 Support** - Easily transcribe audio files in MP3 format
- **Hebrew Language Support** - Optimized for Hebrew language transcription
- **Automatic Audio Splitting** - Smart splitting of long audio files (over 30 seconds) for improved accuracy
- **Real-time Progress Tracking** - Monitor the transcription process with a progress bar and estimated time remaining
- **Persistent API Key Storage** - Securely save your Huggingface API key in your browser for future use

## How It Works

1. Enter your Huggingface API key
2. Upload an MP3 file
3. Choose whether to split long files (recommended for files over 30 seconds)
4. Click "Start Transcription"
5. View and download your completed transcription

## Technical Implementation

- Built with vanilla JavaScript, HTML5, and CSS3
- Uses Web Audio API for audio processing and splitting
- Implements efficient binary slicing for better audio segment quality
- Handles API communication with proper error management
- Completely client-side processing for privacy (audio never stored on external servers)

## Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Huggingface API key with access to Whisper models
- Internet connection to communicate with the Huggingface API

## Limitations

- Currently only supports MP3 file format
- Maximum file size depends on your browser's memory limitations
- Transcription accuracy depends on audio quality and the Whisper model

## Future Improvements

- Support for additional audio formats (WAV, M4A, etc.)
- Batch transcription of multiple files
- Text editing capabilities for post-transcription correction
- Speaker identification for multi-speaker audio

## Credits

- Uses [Huggingface's Inference API](https://huggingface.co/inference-api)
- Transcription powered by [OpenAI's Whisper large-v3 model](https://huggingface.co/openai/whisper-large-v3)

---

Created with ❤️ for the Hebrew-speaking community.
