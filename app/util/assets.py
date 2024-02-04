from flask_assets import Bundle, Environment
from .. import app

bundles = {
    'js': Bundle(  
        'js/libs/d3.js',
        'js/libs/jquery-3.4.1.min.js',
        'js/libs/bootstrap.min.js',
        'js/components/confusionMtxPanel.js',
        'js/VCSetHandler.js',
        'js/initChapter.js',
        'js/renderChapterHandler.js',
        'js/entry.js',
        'js/renderVCHandler.js',
        'js/components/trainTestPanel.js',
        'js/components/LRExplainerPanel.js',
        'js/components/preProcessPanel.js',
        'js/components/postProcessPanel.js',
        'js/utils.js',
        'js/components/fairMetrics.js',
        'js/components/customization.js',
        output='gen/script.js'
        ),

        'css': Bundle(
        'css/bootstrap/bootstrap.css',
        'css/bootstrap/layout-bootstrap.css',
        'css/layout.css',
        'css/content.css',
        output='gen/styles.css'
        )
}

assets = Environment(app)

assets.register(bundles)