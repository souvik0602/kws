import os
import subprocess
import shutil
from flask import Blueprint, render_template, request, jsonify

try:
    from .KWS_V_bng.KWS_prediction import predict_keyword
    from .KWS_V_man.KWS_prediction import predict_keyword_man
    from .KWS_V_miz.KWS_prediction import predict_keyword_miz
    from .KWS_V_hin.KWS_prediction import predict_keyword_hin
except ImportError as e:
    predict_keyword = None
    predict_keyword_man = None
    predict_keyword_miz = None
    predict_keyword_hin = None
    print("KWS ML modules not available:", e)

audio_bp = Blueprint('audio', __name__)

# Create uploads directory 
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@audio_bp.route('/language/<lang>')
def language(lang):
    return render_template('language.html', lang=lang.capitalize(), mode='dependent')

@audio_bp.route('/language_independent/<lang>')
def language_independent(lang):
    return render_template('language.html', lang=lang.capitalize(), mode='independent')


@audio_bp.route('/api/analyze_audio/<lang>', methods=['POST'])
def analyze_audio_language(lang):
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    flag = request.form.get('flag')
    
    if audio_file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    webm_file = None
    wav_file = None
    try:
        if flag == '1':
        # Save the WebM file
            webm_file = os.path.join(UPLOAD_FOLDER, f'file_{lang}_{os.urandom(8).hex()}.webm')
            wav_file = os.path.join(UPLOAD_FOLDER, f'file_{lang}{flag}_{os.urandom(8).hex()}.wav')
            audio_file.save(webm_file)

           
            ffmpeg_path = shutil.which('ffmpeg')
            if not ffmpeg_path:
                return jsonify({'error': 'ffmpeg not found on server. Please install ffmpeg and ensure it is on the system PATH.'}), 500

            # Convert WebM to WAV using ffmpeg
            subprocess.run([
                ffmpeg_path, '-i', webm_file,
                '-acodec', 'pcm_s16le',
                '-ar', '16000',
                '-ac', '2',
                '-y',  
                wav_file
            ], check=True, capture_output=True)
        else:
            wav_file = os.path.join(UPLOAD_FOLDER, f'file_{lang}{flag}_{os.urandom(8).hex()}.wav')
            audio_file.save(wav_file)

        #print(lang)
        try:
            if lang == 'bengali':
                keyword, confidence = predict_keyword(wav_file)
            elif lang == 'manipuri':
                keyword, confidence = predict_keyword_man(wav_file)
            elif lang == 'mizoram':
                keyword, confidence = predict_keyword_miz(wav_file)
        except Exception as e:
            return jsonify({'error': f'Prediction error: {str(e)}'}), 500

        print(f"Predicted keyword: {keyword} with confidence {confidence}")

        return jsonify({
            'output': f'{keyword}',
            'confidence': confidence
        })


    except subprocess.CalledProcessError as e:
        stderr = e.stderr.decode() if e.stderr else str(e)
        return jsonify({'error': f'Audio conversion error: {stderr}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        
        if webm_file:
            try:
                os.remove(webm_file)
            except:
                pass
       
        
@audio_bp.route('/api/analyze_audio_independent', methods=['POST'])
def analyze_audio_independent():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    flag = request.form.get('flag')
    if audio_file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    webm_file = None
    wav_file = None

    try:
        if flag == '1':
            webm_file = os.path.join(UPLOAD_FOLDER, f'recording_independent_{os.urandom(8).hex()}.webm')
            wav_file = os.path.join(UPLOAD_FOLDER, f'recording_independent_{os.urandom(8).hex()}.wav')
            audio_file.save(webm_file)

            # Ensure ffmpeg is available
            ffmpeg_path = shutil.which('ffmpeg')
            if not ffmpeg_path:
                return jsonify({'error': 'ffmpeg not found on server. Please install ffmpeg and ensure it is on the system PATH.'}), 500

            # Convert WebM to WAV using ffmpeg
            subprocess.run([
                ffmpeg_path, '-i', webm_file,
                '-acodec', 'pcm_s16le',
                '-ar', '16000',
                '-ac', '2',
                '-y',  
                wav_file
            ], check=True, capture_output=True)
        else:
            wav_file = os.path.join(UPLOAD_FOLDER, f'recording_independent_{os.urandom(8).hex()}.wav')
            audio_file.save(wav_file)

        try:
            keyword, confidence = predict_keyword_hin(wav_file)
        except Exception as e:
            return jsonify({'error': f'Prediction error: {str(e)}'}), 500

        print(f"Predicted keyword: {keyword} with confidence {confidence}")

        return jsonify({
            'output': f'{keyword}',
            'confidence': confidence
        })
      
    except subprocess.CalledProcessError as e:
        return jsonify({'error': f'Audio conversion error: {e.stderr.decode()}'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
      
        if webm_file:
            try:
                os.remove(webm_file)
            except:
                pass
       
        
