from flask import Flask
from flask_cors import CORS
from blueprints.main import main_bp
from blueprints.audio import audio_bp

app = Flask(__name__)
CORS(app)  


app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

app.register_blueprint(main_bp)
app.register_blueprint(audio_bp)


#use debug mode for development
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8080, debug=True)
