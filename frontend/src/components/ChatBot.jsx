import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RotateCcw, ChevronRight, ArrowLeft, Send } from 'lucide-react'

// ── Menu data ─────────────────────────────────────────────────────
const SUB_MENU = {
  'Welcome': [
    'What does hyperparameter tuning mean?',
    'Do I need coding skills?',
    'Return to Main Menu..',
  ],
  'Upload CSV': [
    'What file types can I upload?',
    'What happens to my column names on upload?',
    'Why is my preview empty after upload?',
    'Return to Main Menu',
  ],
  'Operations': [
    'Which columns are usually safe to remove?',
    'What does AutoFeat actually create?',
    'Will Reset remove my added features too?',
    'Can I download the cleaned dataset later?',
    'Return to Main Menu',
  ],
  'Exploration': [
    'What can I do in D-Tale?',
    'What does the Profiling Report show?',
    'Can I download the Profiling Report later?',
    'Do I really need Exploration before training?',
    'Return to Main Menu',
  ],
  'AutoML Forge': [
    'What is AutoGluon?',
    'How do I choose the target and problem type?',
    'How do I pick an evaluation metric?',
    'What does holdout fraction mean?',
    'Which quality preset should I use?',
    'How long should I train for?',
    'Return to Main Menu',
  ],
  'Downloads': [
    'Why is the model download a ZIP?',
    'What files are always inside the model ZIP?',
    'Should I also download the processed CSV?',
    'What should I do with the Profiling Report?',
    'Return to Main Menu',
  ],
  'What Next ?': [
    'What is inside my Data Alchemy ZIP?',
    'What is inside autogluon_model/?',
    'What are the .pkl and .json files for?',
    'How would I use these files manually?',
    'Is there an easier way to use the ZIP?',
    'How does Deploy Alchemy use this ZIP?',
    'Return to Main Menu',
  ],
}
const MAIN_MENU = Object.keys(SUB_MENU)
const NUDGES = ['Stuck ?','Need a hint ? 👋','Ask me anything !!','I know stuff 🧠',"Don't be shy !!",'Got questions ?',"I'm right here !!",'Try me 🚀','Hovering by...','Need AI magic ? ✨']

// ── Accent colour ─────────────────────────────────────────────────
const ACCENT     = 'var(--purple-accent, #a855f7)'
const ACCENT_RGB = '168, 85, 247'

// ══════════════════════════════════════════════════════════════════
// ── Alchemy Bot Logic (fully client-side, no backend required) ───
// ══════════════════════════════════════════════════════════════════
const RESPONSES = {
  // ── Navigation ────────────────────────────────────────────────
  'Main Menu': 'Returning to the main hub. Select a section to explore:',

  // ── Welcome ───────────────────────────────────────────────────
  'Welcome': (
    'Welcome to <b>Data Alchemy</b>! 🔮 Your no-code AutoML platform.<br><br>' +
    'On this screen you see the core promise: building powerful models in just a few clicks.<br>' +
    '<ul>' +
    '<li><b>Key Features</b> — lists the engines running under the hood.</li>' +
    '<li><b>Quick Start</b> — your 4-step roadmap to a trained model.</li>' +
    '</ul>' +
    '<b>Your first step:</b> Click the red <b>🚀 Start Building Models</b> button, ' +
    'or navigate to <b>Upload Dataset</b> in the sidebar.<br><br>' +
    '<i>💡 Pro Tip: Hover over the spaceship in the bottom-right corner anytime to ask questions as you work!</i>'
  ),
  'What is Hyperparameter Tuning?': (
    'Imagine tuning a radio to find the perfect signal — you need to turn the knobs just right. ' +
    'In machine learning, \'hyperparameters\' are those knobs: things like learning rate, tree depth, or number of layers. ' +
    'Instead of you manually testing thousands of combinations, AutoGluon automatically searches for the settings that ' +
    'give the highest accuracy on your specific data.'
  ),
  'Do I need coding skills?': (
    'Absolutely not! That is the entire point of Data Alchemy. ' +
    'The complex Python code using pandas, AutoFeat, and AutoGluon is completely hidden behind this interface. ' +
    'You just need to understand your data — the platform handles all the mathematics and programming.'
  ),

  // ── Upload CSV ────────────────────────────────────────────────
  'Upload CSV': (
    'You are now in the <b>Upload Lab</b>! This is where your raw data enters the pipeline.<br><br>' +
    '<b>How to use this screen:</b><br>' +
    '1. Drop your file onto the upload zone or click to browse.<br>' +
    '2. Supported formats: <code>.csv</code>, <code>.xlsx</code>, <code>.xls</code><br>' +
    '3. After upload, scroll down to verify the <b>Data Preview</b> table — it shows your first 10 rows.<br><br>' +
    '<i>Note: Column names are automatically sanitized on upload ' +
    '(spaces become underscores, special characters are removed).</i>'
  ),
  "What is 'Sanitization'?": (
    'Raw data often has messy headers like <code>Monthly Income ($)</code>. ' +
    'Spaces and special symbols break many Python libraries. ' +
    'Upon upload, the platform converts that header to <code>Monthly_Income_USD</code> automatically. ' +
    'This ensures every tool in the pipeline works correctly.'
  ),
  'Why only .csv files?': (
    'The platform actually supports <code>.csv</code>, <code>.xlsx</code>, and <code>.xls</code>. ' +
    'CSV is the most universal format for tabular data, but Excel files work too. ' +
    'All formats are internally converted to CSV for a consistent pipeline.'
  ),
  'Preview box is empty?': (
    'The preview table only appears <i>after</i> you successfully upload a file. ' +
    'If the table is still empty after uploading, check that the file format is supported and try again.'
  ),

  // ── Operations ────────────────────────────────────────────────
  'Operations': (
    'Welcome to the <b>Operations Chamber</b>! This is where you refine your raw data.<br><br>' +
    '<b>Your tools:</b><br>' +
    '1. <b>🗑️ Remove Columns:</b> Click noisy columns in the list and press Remove.<br>' +
    '2. <b>🔄 Reset to Original:</b> Made a mistake? This restores your original uploaded file instantly.<br>' +
    '3. <b>🚀 Feature Genius:</b> Runs AutoFeat to discover mathematical signals. ' +
    'After analysis, click <b>\'+ Add\'</b> next to any suggested feature to include it.<br>' +
    '4. <b>⚠️ Null Value Alert:</b> If the page shows a yellow warning, your data has missing values ' +
    '— consider removing those columns before training.<br><br>' +
    '<b>Next Step:</b> Clean your data and click <b>➡️ Next: Exploration</b>!'
  ),
  'Which columns should I remove?': (
    'Remove columns that are unique identifiers or have no predictive value. Good candidates:<br>' +
    '<ul>' +
    '<li><b>ID columns</b> — e.g. <code>PassengerId</code>, <code>CustomerID</code></li>' +
    '<li><b>Name columns</b> — e.g. <code>Name</code>, <code>Email</code></li>' +
    '<li><b>Timestamp columns</b> — unless time-series prediction is your goal</li>' +
    '<li><b>Free-text columns</b> — unless you are doing NLP</li>' +
    '</ul>' +
    'Keep columns that logically explain or correlate with what you are trying to predict.'
  ),
  'What does Feature Genius do?': (
    'Powered by AutoFeat, it uses symbolic regression to test whether mathematical transformations ' +
    'of your numeric columns (like multiplying <code>Age × RoomService</code>, or squaring <code>Income</code>) ' +
    'create a stronger signal than the original columns alone.<br><br>' +
    '<a href="https://github.com/cod3licious/autofeat" target="_blank">📖 AutoFeat Repository</a>'
  ),
  'Is the Yellow Reset button safe?': (
    'Yes! When you first uploaded your CSV, the system secretly saved a pristine backup copy called ' +
    '<code>backup_dataset.csv</code>. Clicking Reset simply overwrites your current working file ' +
    'with that original backup. All your operations (dropped columns, added features) will be undone, ' +
    'but your original data is always preserved.'
  ),
  'Can I download the processed data?': (
    'Yes! Your dataset is saved automatically after every operation. ' +
    'Once you have removed noisy columns and added new features, visit the ' +
    '<b>💾 Downloads</b> tab and click <b>📥 Download CSV</b> to export your upgraded dataset.'
  ),

  // ── Exploration ───────────────────────────────────────────────
  'Exploration': (
    'Welcome to the <b>Exploration Hall</b>! 📊 Before training, you must verify your data is healthy.<br><br>' +
    'Two powerful engines are available:<br>' +
    '1. <b>▶️ Start D-Tale Engine:</b> Opens an interactive, spreadsheet-like interface. ' +
    'Filter, sort, chart, and detect outliers without writing any code.<br>' +
    '2. <b>📊 Generate Profiling Report:</b> Automatically creates a comprehensive HTML report ' +
    'covering distributions, missing values, correlations, and duplicates.<br><br>' +
    '<b>Critical Warning:</b> Look for \'Data Leakage\' — columns that accidentally contain the answer ' +
    'you are trying to predict. Remove them in Operations before training!<br><br>' +
    '<b>Next Step:</b> Audit your data, then click <b>➡️ Next: AutoML Forge</b>.'
  ),
  'What is D-Tale & How do I use it?': (
    'D-Tale brings your data to life with an interactive interface. Key features:<br>' +
    '<ul>' +
    '<li>Filter rows by column values</li>' +
    '<li>Build bar, line, scatter, and correlation charts</li>' +
    '<li>Detect and highlight outliers</li>' +
    '<li>View column-level statistics</li>' +
    '</ul>' +
    '<a href="https://dtale.readthedocs.io/" target="_blank">📖 D-Tale Docs</a>'
  ),
  'What is Pandas (YData) Profiling?': (
    'YData Profiling automates Exploratory Data Analysis (EDA). In one click it generates a report showing:<br>' +
    '<ul>' +
    '<li>Distribution of every column (histograms, value counts)</li>' +
    '<li>Missing value heatmaps</li>' +
    '<li>Correlation matrices between all columns</li>' +
    '<li>Duplicate row detection</li>' +
    '</ul>' +
    '<a href="https://docs.profiling.ydata.ai/" target="_blank">📖 YData Profiling Docs</a>'
  ),
  'Can I download the Profiling Report?': (
    'Yes! After generating the report, a <b>📥 Download Report</b> button appears above the preview. ' +
    'The report is also available from the <b>💾 Downloads</b> tab. ' +
    'It is a standalone <code>.html</code> file you can open in any browser offline.'
  ),
  'Why is Exploration necessary?': (
    'If you feed an AI \'garbage\', it learns garbage. Skipping this step is the most common beginner mistake.<br><br>' +
    'Exploration helps you find:<br>' +
    '<ul>' +
    '<li><b>Data Leakage</b> — accidentally including the answer in your features</li>' +
    '<li><b>Skewed distributions</b> — features that may need transformation</li>' +
    '<li><b>High correlation</b> — redundant columns that add noise</li>' +
    '<li><b>Missing values</b> — gaps that could break model training</li>' +
    '</ul>'
  ),

  // ── AutoML Forge ──────────────────────────────────────────────
  'AutoML Forge': (
    'Welcome to the <b>AutoML Forge</b>! 🤖 Your command center for building a custom AI model.<br><br>' +
    'Configure 6 dials before launching:<br>' +
    '1. <b>Target Column</b> — what the AI will predict<br>' +
    '2. <b>Problem Type</b> — classification or regression?<br>' +
    '3. <b>Evaluation Metric</b> — how the AI grades its own accuracy<br>' +
    '4. <b>Holdout Fraction</b> — data reserved for the final exam<br>' +
    '5. <b>Model Quality Preset</b> — depth of the ensemble<br>' +
    '6. <b>Time Limit</b> — maximum forge burn time in seconds<br><br>' +
    '<b>After training:</b> A <b>🏆 Leaderboard</b> ranks every algorithm tested. ' +
    'The best model is automatically saved and ready to download.'
  ),
  'What is AutoGluon?': (
    'AutoGluon is an open-source AutoML library by Amazon. It automates the full ML pipeline:<br>' +
    '<ul>' +
    '<li><b>Model Selection</b> — tests XGBoost, LightGBM, CatBoost, Neural Nets, and more</li>' +
    '<li><b>Hyperparameter Search</b> — Bayesian optimization to tune every model</li>' +
    '<li><b>Stacking Ensembles</b> — combines the best models for higher accuracy</li>' +
    '<li><b>Time-Bounded Training</b> — respects your time limit setting exactly</li>' +
    '</ul>' +
    '<a href="https://auto.gluon.ai/" target="_blank">📖 AutoGluon Docs</a> | ' +
    '<a href="https://www.youtube.com/results?search_query=autogluon+tutorial" target="_blank">▶️ Watch on YouTube</a>'
  ),
  '1. Choosing a Target & Problem Type?': (
    'The <b>Target Column</b> is the answer column — what you want to predict.<br><br>' +
    '<b>Problem Type Guide:</b><br>' +
    '<ul>' +
    '<li><b>Auto-detect:</b> Let AutoGluon decide (recommended for beginners)</li>' +
    '<li><b>Binary:</b> Target has 2 options (Yes/No, True/False, 0/1)</li>' +
    '<li><b>Multiclass:</b> Target has 3+ categories (e.g. Low/Medium/High)</li>' +
    '<li><b>Regression:</b> Target is a continuous number (Price, Age, Temperature)</li>' +
    '</ul>' +
    '<b>⚠️ Warning:</b> If your target contains text labels, you cannot use Regression.'
  ),
  '2. What is an Evaluation Metric?': (
    'The grading rubric that tells the model what \'winning\' means.<br><br>' +
    '<b>For Classification:</b><br>' +
    '<ul>' +
    '<li><code>Accuracy</code> — % of correct predictions (use for balanced classes)</li>' +
    '<li><code>F1 Score</code> — balances precision and recall (use for imbalanced classes)</li>' +
    '<li><code>ROC AUC</code> — discrimination ability between classes</li>' +
    '</ul>' +
    '<b>For Regression:</b><br>' +
    '<ul>' +
    '<li><code>RMSE</code> — penalizes large errors heavily</li>' +
    '<li><code>MAE</code> — treats all errors equally</li>' +
    '<li><code>R²</code> — how much variance the model explains (1.0 is perfect)</li>' +
    '</ul>'
  ),
  '3. What is the Holdout Fraction?': (
    'The Holdout Fraction reserves a portion of your data that the model <i>never sees</i> during training. ' +
    'After training, this hidden set is used for the \'final exam\' to measure true accuracy.<br><br>' +
    '<b>Default: 20%</b> — the model trains on 80% and is tested on the remaining 20%.<br><br>' +
    'Too low (e.g. 5%) → unreliable accuracy estimate<br>' +
    'Too high (e.g. 40%) → less data to train on, weaker model'
  ),
  '4. Which Model Quality should I pick?': (
    'Higher quality = more models stacked = longer training time.<br><br>' +
    '<ul>' +
    '<li><b>Very Light / Light:</b> Fastest, good for quick prototypes</li>' +
    '<li><b>Medium Quality:</b> Default. Solid baseline in 5 minutes</li>' +
    '<li><b>Good / High Quality:</b> Noticeably better accuracy</li>' +
    '<li><b>Best Quality / Extreme:</b> Maximum accuracy — allow 30–60 min and increase time limit</li>' +
    '<li><b>Interpretable:</b> Only trains glass-box models (for regulatory/explainability needs)</li>' +
    '<li><b>Optimize for Deployment:</b> Small, fast models ready for production APIs</li>' +
    '</ul>'
  ),
  '5. Setting the Time Limit?': (
    'The hard deadline for the entire training run. AutoGluon will stop after this many seconds, ' +
    'keeping the best model found so far.<br><br>' +
    '<b>Recommended settings:</b><br>' +
    '<ul>' +
    '<li><code>Medium Quality</code>: 120–300 seconds</li>' +
    '<li><code>High / Best Quality</code>: 600–1800 seconds</li>' +
    '<li><code>Extreme</code>: 3600+ seconds (1 hour or more)</li>' +
    '</ul>' +
    'If training stops before the progress bar fills, it means AutoGluon finished early — that is normal!'
  ),

  // ── Downloads ─────────────────────────────────────────────────
  'Downloads': (
    'Welcome to <b>The Vault</b>! 💾 Collect the Trinity of Results:<br><br>' +
    '1. <b>📊 Processed Dataset</b> — your cleaned, feature-engineered CSV<br>' +
    '2. <b>🤖 AutoGluon Model</b> — the full trained ensemble as a ZIP archive<br>' +
    '3. <b>📋 Profiling Report</b> — the interactive HTML statistical audit<br><br>' +
    '<b>Seeing a disabled button?</b> That means you skipped that step. ' +
    'You can always go back and generate the missing artifact!'
  ),
  'Why is the model a .zip file?': (
    'An AutoGluon ensemble is not a single file — it is an entire directory! ' +
    'It contains preprocessors, metadata, and individual sub-folders for every algorithm that was trained ' +
    '(XGBoost, LightGBM, Neural Networks, etc.). ' +
    'Zipping ensures all files are bundled together without any critical components being lost.'
  ),
  'What exactly does the ZIP contain?': (
    'After extracting the ZIP you will find:<br>' +
    '<ul>' +
    '<li><code>predictor.pkl</code> — the master object that loads everything</li>' +
    '<li><code>learner.pkl</code> — the ensemble voting logic</li>' +
    '<li><code>models/</code> — subdirectory with trained weights for every algorithm</li>' +
    '<li><code>metadata.json</code> — feature names, target column, problem type</li>' +
    '</ul>' +
    'To use the model: <code>from autogluon.tabular import TabularPredictor; p = TabularPredictor.load(\'path/to/folder\')</code>'
  ),
  'Why download the Processed CSV?': (
    'After using Feature Genius and dropping noisy columns, your dataset is permanently upgraded. ' +
    'Downloading this clean file lets you:<br>' +
    '<ul>' +
    '<li>Build dashboards in Tableau or Power BI</li>' +
    '<li>Use it in other ML frameworks outside Data Alchemy</li>' +
    '<li>Share a clean, documented dataset with your team</li>' +
    '</ul>'
  ),
  'What do I do with the Profiling Report?': (
    'Open the downloaded <code>.html</code> file in any web browser (Chrome, Edge, Firefox) — ' +
    'even without an internet connection. ' +
    'It serves as your official <b>Statistical Certificate</b>, proving your data was explored and validated ' +
    'before model training. Share it with stakeholders or include it in project documentation.'
  ),

  // ── What Next / Deploy ────────────────────────────────────────
  'What Next ?': (
    'Welcome to the <b>Deployment Arena</b>! 🚀 You now have a ZIP generated by Data Alchemy. ' +
    'This package contains everything needed to move from training to deployment.<br><br>' +
    'Inside you\'ll find:<br>' +
    '• <code>autogluon_model/</code> — all trained algorithms and weights.<br>' +
    '• <code>autofeat_model.pkl</code> — the feature engineering pipeline.<br>' +
    '• <code>feature_engineering.json</code> — metadata describing transformations.<br>' +
    '• <b>README</b> — step‑by‑step usage guide.<br><br>' +
    'From here, you can explore each file, learn how to use them, or choose the simpler path with <b>Deploy Alchemy</b>.'
  ),
  'What is inside my Data Alchemy ZIP ?': (
    'Your Data Alchemy ZIP contains four key components:<br><br>' +
    '1. <code>autogluon_model/</code> — a folder with all trained models, weights, and metadata.<br>' +
    '2. <code>autofeat_model.pkl</code> — the serialized AutoFeat pipeline for feature engineering.<br>' +
    '3. <code>feature_engineering.json</code> — a JSON file describing column transformations and engineered features.<br>' +
    '4. <b>README</b> — instructions on how to load and use these files.<br><br>' +
    'Together, these files let you reproduce training, run predictions, or prepare for deployment.'
  ),
  'What is in the models folder ?': (
    'The <code>autogluon_model/</code> directory is the heart of your trained ensemble:<br><br>' +
    '• Sub‑folders for each algorithm (XGBoost, LightGBM, Neural Nets, etc.).<br>' +
    '• Trained weights and checkpoints.<br>' +
    '• Metadata files describing target column, problem type, and evaluation metrics.<br><br>' +
    'This folder ensures every model tested during training can be reloaded or stacked for predictions.'
  ),
  'What is in the .pkl and .json files ?': (
    '• <code>autofeat_model.pkl</code> — a serialized Python object containing the AutoFeat feature engineering pipeline. ' +
    'It knows how to transform raw columns into engineered signals.<br>' +
    '• <code>feature_engineering.json</code> — a JSON file listing all transformations applied (e.g., squared income, age × service). ' +
    'This acts as documentation and ensures consistency when applying the same transformations to new data.'
  ),
  'How do I use these files ?': (
    'You can load and use the files directly:<br><br>' +
    '• In Python: <code>from autogluon.tabular import TabularPredictor; p = TabularPredictor.load(\'autogluon_model\')</code><br>' +
    '• Apply <code>autofeat_model.pkl</code> to transform new datasets before prediction.<br>' +
    '• Use <code>feature_engineering.json</code> as a reference to ensure your new data matches the training schema.<br><br>' +
    'But let\'s be honest — this can feel like too much if you\'re not coding. That\'s why we built a simpler option.'
  ),
  'Is there a simpler way to use this ?': (
    'Yes! That\'s exactly what <b>Deploy Alchemy</b> is for. ' +
    'Instead of manually loading models and pipelines, you just upload the Data Alchemy ZIP. ' +
    'Deploy Alchemy automatically builds a deployable service with prediction windows and an API endpoint.<br><br>' +
    'And it doesn\'t stop there — it also carries over all the critical information from your training run:<br>' +
    '• Which model was chosen as the best performer.<br>' +
    '• The full <b>Leaderboard</b> of algorithms tested.<br>' +
    '• Accuracy, F1, RMSE, and other evaluation metrics.<br>' +
    '• Metadata about your target column and features.<br><br>' +
    'So when you deploy, you don\'t just get a prediction tool — you get a complete snapshot of your model\'s performance and history.'
  ),
  'How does Deploy Alchemy actually deploy my model ?': (
    'Deploy Alchemy follows a clear procedure to transform your training ZIP into a live, deployable package:<br><br>' +
    '1. <b>Upload</b> your Data Alchemy ZIP (containing <code>autogluon_model/</code>, <code>autofeat_model.pkl</code>, <code>feature_engineering.json</code>, and README).<br>' +
    '2. <b>Extract & Validate</b> — the system unpacks the files, checks consistency, and ensures the model can be loaded.<br>' +
    '3. <b>Build Deployment Interface</b> — it generates a new Deployment ZIP with ready‑to‑use windows:<br>' +
    '   • Welcome Window — confirms the model is loaded.<br>' +
    '   • Single Prediction Window — paste one row of data for instant prediction.<br>' +
    '   • Batch Prediction Window — upload a CSV for bulk predictions.<br>' +
    '   • Test Model Window — validate accuracy with sample data.<br>' +
    '4. <b>Bundle Metadata</b> — includes leaderboard, metrics, and feature info so you know exactly what\'s running.<br>' +
    '5. <b>Deliver ZIP</b> — you download the deployable package, extract it, and follow the README to go live.<br><br>' +
    '<i>💡 In short: you hand Deploy Alchemy your training ZIP, and it hands you back a plug‑and‑play deployment ZIP — no coding required.</i>'
  ),
}

// Keyword → response key mapping (sorted by length so specific phrases win)
const KEYWORD_MAP = [
  // AutoGluon
  ['autogluon docs',        'What is AutoGluon?'],
  ['autogluon info',        'What is AutoGluon?'],
  ['model ensemble',        'What is AutoGluon?'],
  ['auto gluon',            'What is AutoGluon?'],
  ['autogluon',             'What is AutoGluon?'],
  ['ensemble',              'What is AutoGluon?'],
  // Feature Genius / AutoFeat
  ['feature genius',        'What does Feature Genius do?'],
  ['feature engineering',   'What does Feature Genius do?'],
  ['auto feat',             'What does Feature Genius do?'],
  ['autofeat',              'What does Feature Genius do?'],
  ['feature repo',          'What does Feature Genius do?'],
  ['feature',               'What does Feature Genius do?'],
  ['feat',                  'What does Feature Genius do?'],
  // Target / Problem type
  ['choose target',         '1. Choosing a Target & Problem Type?'],
  ['target column',         '1. Choosing a Target & Problem Type?'],
  ['problem type',          '1. Choosing a Target & Problem Type?'],
  ['problem',               '1. Choosing a Target & Problem Type?'],
  ['target',                '1. Choosing a Target & Problem Type?'],
  // Evaluation metric
  ['evaluation metric',     '2. What is an Evaluation Metric?'],
  ['evaluation',            '2. What is an Evaluation Metric?'],
  ['metric',                '2. What is an Evaluation Metric?'],
  ['eval',                  '2. What is an Evaluation Metric?'],
  // Holdout / split
  ['holdout fraction',      '3. What is the Holdout Fraction?'],
  ['train test split',      '3. What is the Holdout Fraction?'],
  ['holdout',               '3. What is the Holdout Fraction?'],
  ['split',                 '3. What is the Holdout Fraction?'],
  // Model quality
  ['preset quality',        '4. Which Model Quality should I pick?'],
  ['model quality',         '4. Which Model Quality should I pick?'],
  ['quality',               '4. Which Model Quality should I pick?'],
  ['preset',                '4. Which Model Quality should I pick?'],
  // Time limit
  ['training time',         '5. Setting the Time Limit?'],
  ['time limit',            '5. Setting the Time Limit?'],
  ['timeout',               '5. Setting the Time Limit?'],
  ['time',                  '5. Setting the Time Limit?'],
  // D-Tale
  ['d tale docs',           'What is D-Tale & How do I use it?'],
  ['outliers',              'What is D-Tale & How do I use it?'],
  ['outlier',               'What is D-Tale & How do I use it?'],
  ['explorer',              'What is D-Tale & How do I use it?'],
  ['d tale',                'What is D-Tale & How do I use it?'],
  ['dtale',                 'What is D-Tale & How do I use it?'],
  // Profiling / EDA
  ['profiling report',      'What is Pandas (YData) Profiling?'],
  ['profiling',             'What is Pandas (YData) Profiling?'],
  ['profile',               'What is Pandas (YData) Profiling?'],
  ['exploration',           'Exploration'],
  ['eda',                   'Exploration'],
  // Reset / backup
  ['reset backup',          'Is the Yellow Reset button safe?'],
  ['backup',                'Is the Yellow Reset button safe?'],
  ['reset',                 'Is the Yellow Reset button safe?'],
  ['undo',                  'Is the Yellow Reset button safe?'],
  // Data leakage
  ['why exploration',       'Why is Exploration necessary?'],
  ['why explore',           'Why is Exploration necessary?'],
  ['data leak',             'Why is Exploration necessary?'],
  ['leakage',               'Why is Exploration necessary?'],
  ['leak',                  'Why is Exploration necessary?'],
  // ZIP / contents
  ['what inside zip',       'What is inside my Data Alchemy ZIP ?'],
  ['zip contents',          'What is inside my Data Alchemy ZIP ?'],
  ['zip content',           'What is inside my Data Alchemy ZIP ?'],
  ['models folder',         'What is in the models folder ?'],
  ['readme',                'What is inside my Data Alchemy ZIP ?'],
  ['pkl json',              'What is in the .pkl and .json files ?'],
  ['model zip',             'Why is the model a .zip file?'],
  ['pkl',                   'What is in the .pkl and .json files ?'],
  ['json',                  'What is in the .pkl and .json files ?'],
  ['zip',                   'Why is the model a .zip file?'],
  // Downloads
  ['profiling report download', 'Can I download the Profiling Report?'],
  ['download report',       'Can I download the Profiling Report?'],
  ['download csv',          'Can I download the processed data?'],
  ['processed csv',         'Can I download the processed data?'],
  ['downloads',             'Downloads'],
  ['download',              'Downloads'],
  // Sanitization
  ['clean headers',         "What is 'Sanitization'?"],
  ['sanitization',          "What is 'Sanitization'?"],
  ['sanitize',              "What is 'Sanitization'?"],
  ['clean',                 "What is 'Sanitization'?"],
  // Columns
  ['drop columns',          'Which columns should I remove?'],
  ['drop column',           'Which columns should I remove?'],
  ['remove columns',        'Which columns should I remove?'],
  ['remove column',         'Which columns should I remove?'],
  ['dropcol',               'Which columns should I remove?'],
  ['columns',               'Which columns should I remove?'],
  // Operations / null
  ['missing values',        'Operations'],
  ['null values',           'Operations'],
  ['operations',            'Operations'],
  ['missing',               'Operations'],
  ['null',                  'Operations'],
  ['ops',                   'Operations'],
  // Deploy
  ['how does deploy alchemy', 'How does Deploy Alchemy actually deploy my model ?'],
  ['deploy process',        'How does Deploy Alchemy actually deploy my model ?'],
  ['deploy steps',          'How does Deploy Alchemy actually deploy my model ?'],
  ['how to deploy',         'How does Deploy Alchemy actually deploy my model ?'],
  ['deploy alchemy',        'What Next ?'],
  ['how to use files',      'How do I use these files ?'],
  ['simpler way',           'Is there a simpler way to use this ?'],
  ['use files',             'How do I use these files ?'],
  ['deploy',                'What Next ?'],
  // General
  ['welcome',               'Welcome'],
  ['main menu',             'Main Menu'],
  ['menu',                  'Main Menu'],
  ['help',                  'Main Menu'],
  ['info',                  'Welcome'],
]

const RESPONSE_OVERRIDES = {
  'Welcome': (
    'Welcome to <b>Data Alchemy</b>, your no-code tabular ML workspace.<br><br>' +
    'The current product flow is simple: upload a dataset, refine it, explore it, train with AutoGluon, and export what you need for deployment.<br>' +
    '<ul>' +
    '<li><b>Upload CSV</b> accepts CSV and Excel files.</li>' +
    '<li><b>Operations</b> handles column removal, reset, and AutoFeat suggestions.</li>' +
    '<li><b>Exploration</b> gives you D-Tale and YData Profiling.</li>' +
    '<li><b>AutoML Forge</b> trains and ranks your models.</li>' +
    '<li><b>Downloads</b> is where you export the processed data, reports, and model ZIPs.</li>' +
    '</ul>' +
    '<b>Your first step:</b> start with <b>Upload CSV</b>, then move left to right through the workflow.'
  ),
  'What does hyperparameter tuning mean?': (
    'Hyperparameters are the training settings that shape how a model learns, such as tree depth, learning rate, or ensemble strategy. ' +
    'AutoGluon searches those settings for you inside the time budget you choose.'
  ),
  'Do I need coding skills?': (
    'No. Data Alchemy is designed so you can upload data, engineer features, train models, and export a deployment-ready package without writing Python.'
  ),

  'Upload CSV': (
    'You are in the <b>Upload Lab</b>. This is where a new working project starts.<br><br>' +
    '<b>How to use this screen:</b><br>' +
    '1. Drop your file onto the upload zone or click to browse.<br>' +
    '2. Supported formats: <code>.csv</code>, <code>.xlsx</code>, <code>.xls</code><br>' +
    '3. After upload, check the <b>Data Preview</b> table to confirm the rows and headers look correct.<br><br>' +
    '<i>Column names are sanitized automatically so the rest of the pipeline can use them safely.</i>'
  ),
  'What file types can I upload?': (
    'You can upload <code>.csv</code>, <code>.xlsx</code>, and <code>.xls</code> files. ' +
    'They all enter the same tabular pipeline after upload.'
  ),
  'What happens to my column names on upload?': (
    'Headers are cleaned so every later step can read them reliably. ' +
    'That usually means spaces become underscores, unsafe characters are removed, and duplicate-looking names are made safe before training.'
  ),
  'Why is my preview empty after upload?': (
    'The preview appears only after a successful upload. ' +
    'If it stays empty, the file likely failed validation or could not be parsed. ' +
    'Make sure the file is tabular, supported, and has at least two columns.'
  ),

  'Operations': (
    'Welcome to the <b>Operations</b> screen. This is where you shape the dataset before training.<br><br>' +
    '<b>Your tools:</b><br>' +
    '1. <b>Remove Columns</b> for IDs, leakage, or noisy fields.<br>' +
    '2. <b>Reset to Original</b> to restore the uploaded dataset.<br>' +
    '3. <b>Run AutoFeat Analysis</b> to discover engineered numeric features.<br><br>' +
    'When AutoFeat finishes, each suggestion shows whether it is already <b>Added to dataset</b> or <b>Not added yet</b>, even if you leave and come back later.'
  ),
  'Which columns are usually safe to remove?': (
    'Start with columns that are unlikely to help prediction or might leak the answer.<br>' +
    '<ul>' +
    '<li><b>IDs</b> like <code>PassengerId</code> or <code>CustomerID</code></li>' +
    '<li><b>Leakage columns</b> that already reveal the target</li>' +
    '<li><b>Mostly empty</b> columns that add more noise than signal</li>' +
    '<li><b>Free-text or raw names</b> if you are not doing text modeling</li>' +
    '</ul>' +
    'Keep columns that logically help explain the target.'
  ),
  'What does AutoFeat actually create?': (
    'AutoFeat tests mathematical transformations of your numeric columns, such as products, powers, logs, and square roots, to find stronger signals than the raw columns alone.<br><br>' +
    'It does <b>not</b> add everything automatically. You review the suggestions, add only the ones you want, and the page keeps track of which features are already in your dataset.'
  ),
  'Will Reset remove my added features too?': (
    'Yes. Reset restores the original uploaded dataset for this project. ' +
    'Dropped columns come back, engineered features are removed, and your working copy goes back to the original upload.'
  ),
  'Can I download the cleaned dataset later?': (
    'Yes. The <b>Downloads</b> page lets you export the processed CSV directly. ' +
    'The model ZIPs also include <code>processed_data.csv</code>, which is the exact dataset snapshot used for training.'
  ),

  'Exploration': (
    'Exploration gives you two ways to inspect the dataset before training:<br><br>' +
    '1. <b>D-Tale</b> for interactive filtering, charting, and browsing.<br>' +
    '2. <b>Profiling Report</b> for a one-click HTML audit of distributions, missing values, duplicates, and correlations.<br><br>' +
    'You can train without this step, but it is the best place to catch leakage, odd distributions, and data quality issues early.'
  ),
  'What can I do in D-Tale?': (
    'D-Tale opens an interactive data browser for the current dataset. You can:<br>' +
    '<ul>' +
    '<li>Filter and sort rows quickly</li>' +
    '<li>Build charts without code</li>' +
    '<li>Inspect column-level statistics</li>' +
    '<li>Spot outliers or strange values interactively</li>' +
    '</ul>' +
    '<a href="https://dtale.readthedocs.io/" target="_blank">D-Tale Docs</a>'
  ),
  'What does the Profiling Report show?': (
    'The YData Profiling report summarizes the dataset in one HTML file. It highlights:<br>' +
    '<ul>' +
    '<li>Column distributions and value counts</li>' +
    '<li>Missing-value patterns</li>' +
    '<li>Correlations and redundancy</li>' +
    '<li>Duplicates, warnings, and basic schema health</li>' +
    '</ul>' +
    '<a href="https://docs.profiling.ydata.ai/" target="_blank">YData Profiling Docs</a>'
  ),
  'Can I download the Profiling Report later?': (
    'Yes. Once the report has been generated, you can download it as a standalone <code>.html</code> file from Exploration or later from the <b>Downloads</b> page.'
  ),
  'Do I really need Exploration before training?': (
    'It is not required, but it is strongly recommended. The app can train without profiling or D-Tale, but exploration helps you catch issues that hurt model quality.<br><br>' +
    'This step is especially useful for finding:<br>' +
    '<ul>' +
    '<li><b>Leakage</b> that accidentally reveals the answer</li>' +
    '<li><b>Missing values</b> and duplicates</li>' +
    '<li><b>Skewed or strange distributions</b></li>' +
    '<li><b>Highly redundant columns</b></li>' +
    '</ul>'
  ),

  'AutoML Forge': (
    'Welcome to the <b>AutoML Forge</b>. This is where you configure and launch model training.<br><br>' +
    'Before you start, choose:<br>' +
    '1. <b>Target Column</b> - what the model should predict<br>' +
    '2. <b>Problem Type</b> - auto, binary, multiclass, or regression<br>' +
    '3. <b>Evaluation Metric</b> - how the run is scored<br>' +
    '4. <b>Holdout Fraction</b> - the validation split<br>' +
    '5. <b>Quality Preset</b> - speed versus accuracy<br>' +
    '6. <b>Time Limit</b> - the total training budget in seconds<br><br>' +
    'After training you get a leaderboard, feature importance, and run metadata here. ZIP exports happen from the <b>Downloads</b> page.'
  ),
  'What is AutoGluon?': (
    'AutoGluon is the AutoML engine under the hood. It automates much of the tabular ML workflow:<br>' +
    '<ul>' +
    '<li><b>Model comparison</b> across multiple tabular learners</li>' +
    '<li><b>Automatic tuning</b> inside your time budget</li>' +
    '<li><b>Weighted ensembles</b> when combining models helps</li>' +
    '<li><b>Leaderboards</b> so you can see what performed best</li>' +
    '</ul>' +
    '<a href="https://auto.gluon.ai/" target="_blank">AutoGluon Docs</a>'
  ),
  'How do I choose the target and problem type?': (
    'The <b>target</b> is the column you want the model to predict.<br><br>' +
    '<b>Problem type guide:</b><br>' +
    '<ul>' +
    '<li><b>Auto-detect</b> for the easiest start</li>' +
    '<li><b>Binary</b> for two classes like yes/no</li>' +
    '<li><b>Multiclass</b> for three or more labels</li>' +
    '<li><b>Regression</b> for continuous numeric targets like price or age</li>' +
    '</ul>' +
    'If you are unsure, start with <b>Auto-detect</b>.'
  ),
  'How do I pick an evaluation metric?': (
    'The metric defines what a good model means for your use case.<br><br>' +
    '<b>Classification metrics:</b><br>' +
    '<ul>' +
    '<li><code>Accuracy</code> for balanced class problems</li>' +
    '<li><code>F1 Score</code> when imbalance matters</li>' +
    '<li><code>ROC AUC</code> when ranking class separation matters</li>' +
    '</ul>' +
    '<b>Regression metrics:</b><br>' +
    '<ul>' +
    '<li><code>RMSE</code> to punish large errors more strongly</li>' +
    '<li><code>MAE</code> for average absolute error</li>' +
    '<li><code>R2</code> for explained variance</li>' +
    '</ul>' +
    'If you do not have a strong reason to choose, keep the metric on <b>Default (Auto)</b>.'
  ),
  'What does holdout fraction mean?': (
    'Holdout fraction is the share of rows reserved for validation. Those rows are not used for fitting the final model during that run, so they give you a cleaner quality check.<br><br>' +
    '<b>Default:</b> <code>0.2</code> means 80% train and 20% holdout.'
  ),
  'Which quality preset should I use?': (
    'Presets control the balance between speed, export size, and search depth.<br><br>' +
    '<ul>' +
    '<li><b>Very Light</b> for the fastest run and smallest export</li>' +
    '<li><b>Medium</b> as the default starting point</li>' +
    '<li><b>Good</b> or <b>High</b> for a stronger search</li>' +
    '<li><b>High v1.5</b> and <b>Best v1.5</b> for the optimized newer variants</li>' +
    '<li><b>Best</b> or <b>Extreme</b> when you want maximum effort and can wait longer</li>' +
    '<li><b>Interpretable</b> when you prefer simpler, easier-to-explain models</li>' +
    '</ul>'
  ),
  'How long should I train for?': (
    'Time limit is the total training budget for the run. AutoGluon stops when that budget is reached and keeps the best result found so far.<br><br>' +
    '<b>Reasonable starting points:</b><br>' +
    '<ul>' +
    '<li><code>Medium</code>: 120 to 300 seconds</li>' +
    '<li><code>High</code> or <code>Best</code>: 600 to 1800 seconds</li>' +
    '<li><code>Extreme</code>: 1800 seconds and up</li>' +
    '</ul>' +
    'For a first pass, <code>300</code> seconds is a solid default.'
  ),

  'Downloads': (
    'Welcome to <b>The Vault</b>. This page is the handoff point for everything you produced.<br><br>' +
    'From here you can download:<br>' +
    '1. <b>Processed CSV</b> for the current working dataset<br>' +
    '2. <b>Model ZIPs</b> for each AutoML run<br>' +
    '3. <b>Profiling Report</b> if you generated one<br><br>' +
    'For model exports, each run has its own card. Click <b>Choose Models &amp; Download ZIP</b>, select up to <b>5</b> models, and the app auto-includes any required ensemble dependencies while estimating ZIP size.'
  ),
  'Why is the model download a ZIP?': (
    'A trained AutoGluon predictor is a folder, not a single file. The ZIP keeps the predictor directory, metadata, README, and training snapshot together so nothing important gets lost when you move it to another machine.'
  ),
  'What files are always inside the model ZIP?': (
    'Every valid model export includes these core files:<br>' +
    '<ul>' +
    '<li><code>autogluon_model/</code> - the predictor directory you load for inference</li>' +
    '<li><code>processed_data.csv</code> - the exact dataset snapshot used for training</li>' +
    '<li><code>feature_engineering.json</code> - feature and run metadata</li>' +
    '<li><code>README.md</code> - loading and usage notes</li>' +
    '</ul>' +
    'Optional extras appear only when available: <code>autofeat_model.pkl</code> when AutoFeat was used, and <code>profile_report.html</code> when a profiling report exists.'
  ),
  'Should I also download the processed CSV?': (
    'Yes if you want the exact feature set you trained on. It is useful for auditing the final schema, sharing the cleaned dataset with teammates, or reusing the same features in another tool. The file is also included inside the model ZIP.'
  ),
  'What should I do with the Profiling Report?': (
    'Open the downloaded <code>.html</code> file in any browser. It is a convenient way to review column distributions, missing values, and correlations, and it is easy to share with teammates or stakeholders.'
  ),

  'What Next ?': (
    'You now have the export package that bridges training and deployment.<br><br>' +
    'The core of that package is the AutoGluon predictor folder, the processed training snapshot, and the metadata that explains how the run was built. If you also generated AutoFeat or a profiling report, those files can travel with the ZIP too.<br><br>' +
    'From here you can either use the files manually in Python or hand the ZIP to <b>Deploy Alchemy</b> for a simpler deployment path.'
  ),
  'What is inside my Data Alchemy ZIP?': (
    'The export is built around these required pieces:<br><br>' +
    '1. <code>autogluon_model/</code> - the trained predictor folder<br>' +
    '2. <code>processed_data.csv</code> - the training snapshot used for the run<br>' +
    '3. <code>feature_engineering.json</code> - metadata about target, features, and engineered columns<br>' +
    '4. <code>README.md</code> - loading instructions<br><br>' +
    'Optional files appear only when available: <code>autofeat_model.pkl</code> if AutoFeat was used and <code>profile_report.html</code> if you generated profiling.'
  ),
  'What is inside autogluon_model/?': (
    'That folder is the predictor you actually load for inference. It contains the trained model artifacts plus the metadata AutoGluon needs to recreate the predictor state.<br><br>' +
    'If you exported a selective ZIP, this folder contains only the models you chose plus any dependencies needed by an ensemble.'
  ),
  'What are the .pkl and .json files for?': (
    '<code>autofeat_model.pkl</code> is optional. When present, it stores the fitted AutoFeat transformer so the same engineered features can be recreated on new data.<br><br>' +
    '<code>feature_engineering.json</code> is the always-on metadata file. It documents the target, feature setup, and engineered feature context that the export was built with.'
  ),
  'How would I use these files manually?': (
    'You can load the model directly in Python:<br><br>' +
    '<code>from autogluon.tabular import TabularPredictor<br>' +
    'predictor = TabularPredictor.load("autogluon_model/")<br>' +
    'predictions = predictor.predict(new_data)</code><br><br>' +
    'Use <code>processed_data.csv</code> as your schema reference. If <code>autofeat_model.pkl</code> exists, apply that same transformation step before prediction.'
  ),
  'Is there an easier way to use the ZIP?': (
    'Yes. <b>Deploy Alchemy</b> is the simpler path. Instead of manually loading the predictor and wiring up inference code yourself, you upload the Data Alchemy ZIP and use that as the handoff package for deployment.'
  ),
  'How does Deploy Alchemy use this ZIP?': (
    'Deploy Alchemy treats the Data Alchemy ZIP as the source package for deployment.<br><br>' +
    'At minimum it can work from the required export pieces: <code>autogluon_model/</code>, <code>processed_data.csv</code>, <code>feature_engineering.json</code>, and <code>README.md</code>.<br><br>' +
    'If AutoFeat or a profiling report exists, those can come along too. The idea is simple: train in Data Alchemy, export once, then use that ZIP as the deployment handoff.'
  ),
}

const LEGACY_RESPONSE_OVERRIDES = {
  'What is Hyperparameter Tuning?': RESPONSE_OVERRIDES['What does hyperparameter tuning mean?'],
  "What is 'Sanitization'?": RESPONSE_OVERRIDES['What happens to my column names on upload?'],
  'Why only .csv files?': RESPONSE_OVERRIDES['What file types can I upload?'],
  'Preview box is empty?': RESPONSE_OVERRIDES['Why is my preview empty after upload?'],
  'Which columns should I remove?': RESPONSE_OVERRIDES['Which columns are usually safe to remove?'],
  'What does Feature Genius do?': RESPONSE_OVERRIDES['What does AutoFeat actually create?'],
  'Is the Yellow Reset button safe?': RESPONSE_OVERRIDES['Will Reset remove my added features too?'],
  'Can I download the processed data?': RESPONSE_OVERRIDES['Can I download the cleaned dataset later?'],
  'What is D-Tale & How do I use it?': RESPONSE_OVERRIDES['What can I do in D-Tale?'],
  'What is Pandas (YData) Profiling?': RESPONSE_OVERRIDES['What does the Profiling Report show?'],
  'Can I download the Profiling Report?': RESPONSE_OVERRIDES['Can I download the Profiling Report later?'],
  'Why is Exploration necessary?': RESPONSE_OVERRIDES['Do I really need Exploration before training?'],
  '1. Choosing a Target & Problem Type?': RESPONSE_OVERRIDES['How do I choose the target and problem type?'],
  '2. What is an Evaluation Metric?': RESPONSE_OVERRIDES['How do I pick an evaluation metric?'],
  '3. What is the Holdout Fraction?': RESPONSE_OVERRIDES['What does holdout fraction mean?'],
  '4. Which Model Quality should I pick?': RESPONSE_OVERRIDES['Which quality preset should I use?'],
  '5. Setting the Time Limit?': RESPONSE_OVERRIDES['How long should I train for?'],
  'Why is the model a .zip file?': RESPONSE_OVERRIDES['Why is the model download a ZIP?'],
  'What exactly does the ZIP contain?': RESPONSE_OVERRIDES['What files are always inside the model ZIP?'],
  'Why download the Processed CSV?': RESPONSE_OVERRIDES['Should I also download the processed CSV?'],
  'What do I do with the Profiling Report?': RESPONSE_OVERRIDES['What should I do with the Profiling Report?'],
  'What is inside my Data Alchemy ZIP ?': RESPONSE_OVERRIDES['What is inside my Data Alchemy ZIP?'],
  'What is in the models folder ?': RESPONSE_OVERRIDES['What is inside autogluon_model/?'],
  'What is in the .pkl and .json files ?': RESPONSE_OVERRIDES['What are the .pkl and .json files for?'],
  'How do I use these files ?': RESPONSE_OVERRIDES['How would I use these files manually?'],
  'Is there a simpler way to use this ?': RESPONSE_OVERRIDES['Is there an easier way to use the ZIP?'],
  'How does Deploy Alchemy actually deploy my model ?': RESPONSE_OVERRIDES['How does Deploy Alchemy use this ZIP?'],
}

const KEYWORD_OVERRIDES = [
  ['what file types can i upload', 'What file types can I upload?'],
  ['column names on upload', 'What happens to my column names on upload?'],
  ['preview empty after upload', 'Why is my preview empty after upload?'],
  ['excel file', 'What file types can I upload?'],
  ['xlsx', 'What file types can I upload?'],
  ['xls', 'What file types can I upload?'],
  ['sanitization', 'What happens to my column names on upload?'],
  ['sanitize', 'What happens to my column names on upload?'],
  ['clean headers', 'What happens to my column names on upload?'],
  ['preview empty', 'Why is my preview empty after upload?'],

  ['which columns are safe to remove', 'Which columns are usually safe to remove?'],
  ['what does autofeat create', 'What does AutoFeat actually create?'],
  ['will reset remove my added features', 'Will Reset remove my added features too?'],
  ['download cleaned dataset', 'Can I download the cleaned dataset later?'],
  ['feature genius', 'What does AutoFeat actually create?'],
  ['feature engineering', 'What does AutoFeat actually create?'],
  ['auto feat', 'What does AutoFeat actually create?'],
  ['autofeat', 'What does AutoFeat actually create?'],
  ['added to dataset', 'What does AutoFeat actually create?'],
  ['not added yet', 'What does AutoFeat actually create?'],
  ['reset', 'Will Reset remove my added features too?'],
  ['undo', 'Will Reset remove my added features too?'],
  ['remove columns', 'Which columns are usually safe to remove?'],
  ['drop columns', 'Which columns are usually safe to remove?'],

  ['profiling report later', 'Can I download the Profiling Report later?'],
  ['what does the profiling report show', 'What does the Profiling Report show?'],
  ['do i need exploration', 'Do I really need Exploration before training?'],
  ['d tale', 'What can I do in D-Tale?'],
  ['dtale', 'What can I do in D-Tale?'],
  ['outlier', 'What can I do in D-Tale?'],
  ['profiling report', 'What does the Profiling Report show?'],
  ['ydata', 'What does the Profiling Report show?'],
  ['profile', 'What does the Profiling Report show?'],
  ['leakage', 'Do I really need Exploration before training?'],
  ['data leak', 'Do I really need Exploration before training?'],

  ['choose the target and problem type', 'How do I choose the target and problem type?'],
  ['evaluation metric', 'How do I pick an evaluation metric?'],
  ['holdout fraction', 'What does holdout fraction mean?'],
  ['quality preset', 'Which quality preset should I use?'],
  ['how long should i train', 'How long should I train for?'],
  ['problem type', 'How do I choose the target and problem type?'],
  ['target column', 'How do I choose the target and problem type?'],
  ['metric', 'How do I pick an evaluation metric?'],
  ['holdout', 'What does holdout fraction mean?'],
  ['train test split', 'What does holdout fraction mean?'],
  ['very light', 'Which quality preset should I use?'],
  ['medium quality', 'Which quality preset should I use?'],
  ['high quality', 'Which quality preset should I use?'],
  ['best quality', 'Which quality preset should I use?'],
  ['extreme quality', 'Which quality preset should I use?'],
  ['interpretable', 'Which quality preset should I use?'],
  ['time limit', 'How long should I train for?'],
  ['training time', 'How long should I train for?'],

  ['what files are inside the model zip', 'What files are always inside the model ZIP?'],
  ['selective zip', 'What files are always inside the model ZIP?'],
  ['feature_engineering.json', 'What files are always inside the model ZIP?'],
  ['processed_data.csv', 'Should I also download the processed CSV?'],
  ['download report', 'What should I do with the Profiling Report?'],
  ['download csv', 'Should I also download the processed CSV?'],
  ['model zip', 'Why is the model download a ZIP?'],

  ['what is inside my data alchemy zip', 'What is inside my Data Alchemy ZIP?'],
  ['what is inside autogluon_model', 'What is inside autogluon_model/?'],
  ['how would i use these files manually', 'How would I use these files manually?'],
  ['what are the pkl and json files for', 'What are the .pkl and .json files for?'],
  ['how does deploy alchemy use this zip', 'How does Deploy Alchemy use this ZIP?'],
  ['autogluon_model', 'What is inside autogluon_model/?'],
  ['autofeat_model.pkl', 'What are the .pkl and .json files for?'],
  ['feature engineering json', 'What are the .pkl and .json files for?'],
  ['pkl', 'What are the .pkl and .json files for?'],
  ['json', 'What are the .pkl and .json files for?'],
  ['manual', 'How would I use these files manually?'],
  ['simpler way', 'Is there an easier way to use the ZIP?'],
]

const RESPONSE_BANK = { ...RESPONSES, ...LEGACY_RESPONSE_OVERRIDES, ...RESPONSE_OVERRIDES }
const MATCH_KEYWORDS = [...KEYWORD_OVERRIDES, ...KEYWORD_MAP]

/**
 * Pure-JS bot response — runs entirely in the browser, no network needed.
 */
function alchemyBotResponse(userMessage) {
  const msg = userMessage.trim()

  // Exact match first
  if (RESPONSE_BANK[msg] !== undefined) return RESPONSE_BANK[msg]

  // Fuzzy keyword match (longer phrases checked first — array is pre-sorted)
  const lower = msg.toLowerCase()
  for (const [keyword, responseKey] of MATCH_KEYWORDS) {
    if (lower.includes(keyword) && RESPONSE_BANK[responseKey]) {
      return `<i>Matched your question to a related topic:</i><br><br>${RESPONSE_BANK[responseKey]}`
    }
  }

  return (
    'I am the <b>Alchemy Assistant</b>. I didn\'t recognize that specific question, ' +
    'but I can help with upload, operations, exploration, AutoML, downloads, or deployment. ' +
    'Try selecting the section you are currently working in for step-by-step guidance.'
  )
}

// ── 3D Spaceship Avatar ───────────────────────────────────────────
function RealisticSpaceshipSVG({ isFlying, isSleeping }) {
  const accent    = ACCENT
  const hotCore   = '#ffffff'
  const darkMetal = '#0a0d14'

  const flameScaleY  = isSleeping ? 0         : (isFlying ? [1,1.6,1.2,1.8,1] : [0.4,0.6,0.4])
  const flameOpacity = isSleeping ? 0         : (isFlying ? 1 : 0.6)

  return (
    <div style={{ width:85, height:110, perspective:1000, position:'relative' }}>
      <div style={{
        position:'absolute', top:'15%', left:'15%', width:'70%', height:'70%',
        background: ACCENT, filter:'blur(22px)',
        opacity: isSleeping ? 0.1 : (isFlying ? 0.8 : 0.45),
        borderRadius:'50%', transition:'opacity 0.4s ease', zIndex:0,
      }}/>
      <svg viewBox="0 0 100 140" style={{ width:'100%', height:'100%', overflow:'visible', position:'relative', zIndex:1 }}>
        <defs>
          <radialGradient id="hullGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%"   stopColor="#4a5568"/>
            <stop offset="55%"  stopColor="#1a202c"/>
            <stop offset="100%" stopColor={darkMetal}/>
          </radialGradient>
          <radialGradient id="visorGrad" cx="35%" cy="30%" r="65%">
            <stop offset="0%"   stopColor="#2d3748"/>
            <stop offset="45%"  stopColor="#05080f"/>
            <stop offset="100%" stopColor="#000000"/>
          </radialGradient>
          <linearGradient id="metalGrad" x1="0" y1="0" x2="0" y2="100%">
            <stop offset="0%"   stopColor="#718096"/>
            <stop offset="100%" stopColor="#1a202c"/>
          </linearGradient>
          <linearGradient id="flameGrad" x1="0" y1="0" x2="0" y2="100%">
            <stop offset="0%"   stopColor="#ffffff"/>
            <stop offset="25%"  stopColor={ACCENT}/>
            <stop offset="100%" stopColor={`rgba(${ACCENT_RGB}, 0)`}/>
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
          <filter id="intenseGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>
        <path d="M 15 35 Q 5 50 12 65 L 25 70 L 30 40 Z" fill="url(#metalGrad)" stroke={darkMetal} strokeWidth="1.5"/>
        <path d="M 30 70 C 40 78, 55 78, 62 70 L 58 85 C 50 88, 40 88, 32 85 Z" fill="url(#metalGrad)" stroke={darkMetal} strokeWidth="2"/>
        <motion.path d="M 30 85 Q 45 150 60 85 Z" fill={accent} filter="url(#intenseGlow)"
          opacity={isSleeping ? 0 : (isFlying ? 0.7 : 0.3)}
          animate={{ scaleY: flameScaleY }}
          transition={{ duration:0.1, repeat:Infinity, repeatType:'reverse' }}
          style={{ originX:'45px', originY:'85px' }}/>
        <motion.path d="M 35 85 Q 45 130 55 85 Z" fill="url(#flameGrad)"
          opacity={flameOpacity}
          animate={{ scaleY: flameScaleY }}
          transition={{ duration:0.15, repeat:Infinity, repeatType:'reverse' }}
          style={{ originX:'45px', originY:'85px' }}/>
        <circle cx="45" cy="45" r="32" fill="url(#hullGrad)" stroke={darkMetal} strokeWidth="2"/>
        <circle cx="45" cy="45" r="30.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
        <path d="M 20 25 Q 35 15 55 15" fill="none" stroke={darkMetal} strokeWidth="1.5" opacity="0.7"/>
        <path d="M 15 50 Q 30 70 55 75" fill="none" stroke={darkMetal} strokeWidth="1.5" opacity="0.7"/>
        <path d="M 50 22 C 78 22, 85 35, 75 55 C 65 72, 45 65, 35 55 C 25 45, 32 22, 50 22 Z" fill="url(#visorGrad)" stroke={darkMetal} strokeWidth="2"/>
        <path d="M 50 25 C 68 25, 75 32, 68 45 C 55 35, 42 35, 38 48 C 34 40, 38 25, 50 25 Z" fill="rgba(255,255,255,0.1)"/>
        {!isSleeping ? (
          <motion.g animate={{ x: isFlying ? 2 : 0 }} transition={{ type:'spring', stiffness:100 }}>
            <ellipse cx="58" cy="44" rx="7" ry="9" fill={accent} filter="url(#glow)" opacity="0.9"/>
            <circle  cx="60" cy="43" r="2.5" fill={hotCore} filter="url(#glow)"/>
            <line x1="38" y1="44" x2="68" y2="44" stroke={accent} strokeWidth="2" opacity="0.8" filter="url(#glow)"/>
          </motion.g>
        ) : (
          <motion.line x1="42" y1="46" x2="65" y2="46" stroke={accent} strokeWidth="2.5"
            strokeLinecap="round" opacity="0.4"
            initial={{ opacity:0 }} animate={{ opacity:[0.2,0.6,0.2] }} transition={{ duration:3, repeat:Infinity }}/>
        )}
        <path d="M 45 45 L 30 35 L 18 40 L 25 60 L 45 65 Z" fill="url(#metalGrad)" stroke={darkMetal} strokeWidth="2" opacity="0.95"/>
        <circle cx="32" cy="50" r="3" fill={darkMetal} opacity="0.6"/>
      </svg>
    </div>
  )
}

// ── Typing animation ──────────────────────────────────────────────
function TypingMessage({ html, onDone, onType }) {
  const [displayedHtml, setDisplayedHtml] = useState('')
  const [done, setDone] = useState(false)
  // Keep callback refs stable so the interval closure always calls the
  // latest version without needing to restart the effect.
  const onDoneRef = useRef(onDone)
  const onTypeRef = useRef(onType)
  useEffect(() => { onDoneRef.current = onDone }, [onDone])
  useEffect(() => { onTypeRef.current = onType }, [onType])

  useEffect(() => {
    const tmp = document.createElement('div'); tmp.innerHTML = html
    const plain = tmp.textContent || ''
    let i = 0
    const delay = plain.length > 200 ? 15 : 25
    const iv = setInterval(() => {
      i++
      const ratio  = Math.min(i / plain.length, 1)
      const cutoff = Math.floor(html.length * ratio)
      let safe     = cutoff
      const openTag = html.lastIndexOf('<', safe), closeTag = html.lastIndexOf('>', safe)
      if (openTag > closeTag) safe = openTag
      setDisplayedHtml(html.slice(0, safe))
      onTypeRef.current?.()
      if (i >= plain.length) { clearInterval(iv); setDisplayedHtml(html); setDone(true); onDoneRef.current?.() }
    }, delay)
    return () => clearInterval(iv)
  }, [html])  // only restart if the html content itself changes

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: displayedHtml }}/>
      {!done && (
        <motion.span animate={{ opacity:[1,0] }} transition={{ duration:0.45, repeat:Infinity }}
          style={{ display:'inline-block', width:2, height:'1em', background:ACCENT, verticalAlign:'text-bottom', marginLeft:1, borderRadius:1 }}/>
      )}
    </div>
  )
}

// ── Thinking indicator ────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div style={{ display:'flex', gap:6, alignItems:'center', padding:'4px 0' }}>
      <span style={{ fontSize:11, color:ACCENT, fontFamily:'var(--font-mono)', opacity:0.7 }}>Thinking...</span>
      {[0,1,2,3].map(i => (
        <motion.div key={i}
          animate={{ scaleY:[0.4,1.4,0.4], opacity:[0.3,1,0.3] }}
          transition={{ duration:0.7, delay:i*0.12, repeat:Infinity, ease:'easeInOut' }}
          style={{ width:3, height:14, borderRadius:2, background:`hsl(${260+i*15},90%,65%)` }}/>
      ))}
    </div>
  )
}

// ── Main ChatBot ──────────────────────────────────────────────────
export default function ChatBot() {
  const [open,        setOpen]        = useState(false)
  const [inputText,   setInputText]   = useState('')
  const [loading,     setLoading]     = useState(false)
  const [typingIdx,   setTypingIdx]   = useState(null)
  const [visible,     setVisible]     = useState(() => !!sessionStorage.getItem('alchemyIntroSeen'))
  const [activityState, setActivityState] = useState('hover') // 'hover' | 'fly'
  const [isSleeping,  setIsSleeping]  = useState(false)
  const [nudge,       setNudge]       = useState('')
  const [path,        setPath]        = useState({ x:0, y:0, rotateZ:0, rotateY:0 })

  const [messages, setMessages] = useState([{
    role:'bot',
    html:'<b>System Initialized.</b> Select a section or type your question below:',
    buttons:{ type:'main' },
    typed:true,
  }])

  const bottomRef   = useRef(null)
  // Generation counter: each send() call captures its own generation number.
  // If reset() or a newer send() increments sendGenRef before the delay
  // finishes, the stale call bails out — prevents double bot-messages.
  const sendGenRef  = useRef(0)

  // Show bot after intro fires event — AND as a fallback if user skips Welcome
  useEffect(() => {
    const onDone = () => setVisible(true)
    window.addEventListener('alchemyIntroDone', onDone)
    // Fallback: if user navigates directly to any page other than Welcome,
    // the alchemyIntroDone event never fires. Show the bot after 3 s anyway.
    const fallback = setTimeout(() => setVisible(true), 3000)
    return () => {
      window.removeEventListener('alchemyIntroDone', onDone)
      clearTimeout(fallback)
    }
  }, [])

  // 90s inactivity → sleep
  useEffect(() => {
    if (open) return
    const t = setTimeout(() => {
      setIsSleeping(true)
      setActivityState('hover')
      setPath({ x:-90, y:0, rotateZ:0, rotateY:0 })
    }, 90000)
    return () => clearTimeout(t)
  }, [open])

  // Hover ↔ Fly cycle
  useEffect(() => {
    if (open || isSleeping || !visible) return
    let t
    if (activityState === 'hover') {
      t = setTimeout(() => {
        const maxX = Math.max(300, window.innerWidth  - 150)
        const maxY = Math.max(300, window.innerHeight - 150)
        const rx1 = -(Math.random() * (maxX * 0.7) + 100)
        const ry1 = -(Math.random() * (maxY * 0.8) + 100)
        const rx2 = -(Math.random() * maxX)
        const ry2 = -(Math.random() * maxY)
        const rx3 = -(Math.random() * (maxX * 0.5) + 50)
        const ry3 = -(Math.random() * (maxY * 0.5) + 100)
        setPath({
          x: [0, rx1, rx2, rx3, 0],
          y: [0, ry1, ry2, ry3, 0],
          rotateZ: [0, 25, -20, 30, 0],
          rotateY: [0, rx1 < -(maxX/2) ? 180 : 0, rx2 > rx1 ? 0 : 180, 0, 0],
        })
        setActivityState('fly')
        setNudge('')
      }, 15000)
    } else {
      t = setTimeout(() => {
        setActivityState('hover')
        setPath({ x:0, y:0, rotateZ:0, rotateY:0 })
      }, 10000)
    }
    return () => clearTimeout(t)
  }, [activityState, open, isSleeping, visible])

  // Nudge during hover
  useEffect(() => {
    if (open || isSleeping || !visible || activityState !== 'hover') return
    const showNudge = () => {
      setNudge(NUDGES[Math.floor(Math.random() * NUDGES.length)])
      setTimeout(() => setNudge(''), 3500)
    }
    showNudge()
    const iv = setInterval(showNudge, 5000)
    return () => clearInterval(iv)
  }, [activityState, open, isSleeping, visible])

  // Reset on open
  useEffect(() => {
    if (open) {
      setIsSleeping(false)
      setActivityState('hover')
      setPath({ x:0, y:0, rotateZ:0, rotateY:0 })
      setNudge('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 50)
    }
  }, [open])

  // Scroll on new messages / loading change
  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 50)
  }, [messages, loading, open])

  // ── Fully client-side send — no network call ─────────────────
  async function send(choice) {
    if (!choice.trim()) return

    // Increment generation: any in-flight send with a different generation
    // will see the mismatch after its delay and bail out silently.
    sendGenRef.current += 1
    const thisGen = sendGenRef.current

    setMessages(m => [...m, { role:'user', text:choice }])
    setLoading(true)

    // Simulate a realistic "thinking" delay (1.8 – 2.8 s)
    const delay = 1800 + Math.random() * 1000
    await new Promise(resolve => setTimeout(resolve, delay))

    // Bail if reset() was called or a newer send() already started
    if (sendGenRef.current !== thisGen) return

    const responseHtml = alchemyBotResponse(choice)

    const btn = choice === 'Main Menu'
      ? { type:'main' }
      : SUB_MENU[choice]
        ? { type:'sub', items:SUB_MENU[choice] }
        : { type:'back' }

    const msg = { role:'bot', html:responseHtml, buttons:btn, typed:false }
    setMessages(m => { const n = [...m, msg]; setTypingIdx(n.length - 1); return n })
    setLoading(false)
  }

  function reset() {
    sendGenRef.current += 1  // invalidates any pending send delay
    setLoading(false)
    setInputText('')
    setTypingIdx(null)
    setMessages([{
      role:'bot',
      html:'<b>System Initialized.</b> Select a section or type your question below:',
      buttons:{ type:'main' },
      typed:true,
    }])
  }

  function renderButtons(buttons, msgIdx) {
    if (msgIdx === typingIdx || !buttons) return null
    if (buttons.type === 'main') return (
      <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:4 }}>
        {MAIN_MENU.map(item => (
          <button key={item} className="chat-menu-btn" onClick={() => send(item)} disabled={loading}
            style={{ borderColor:`rgba(${ACCENT_RGB},0.3)` }}>
            <ChevronRight size={11} style={{ marginRight:4, verticalAlign:'middle' }}/>{item}
          </button>
        ))}
      </div>
    )
    if (buttons.type === 'sub') return (
      <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:4 }}>
        {buttons.items.map(item =>
          item.startsWith('Return') || item === 'Main Menu'
            ? <button key={item} className="chat-menu-btn" onClick={() => send('Main Menu')} disabled={loading}
                style={{ borderColor:'var(--border-2)', color:'var(--text-3)' }}>
                <ArrowLeft size={11} style={{ marginRight:4, verticalAlign:'middle' }}/>Return to Main Menu
              </button>
            : <button key={item} className="chat-menu-btn" onClick={() => send(item)} disabled={loading}
                style={{ borderColor:`rgba(${ACCENT_RGB},0.3)` }}>
                <ChevronRight size={11} style={{ marginRight:4, verticalAlign:'middle' }}/>{item}
              </button>
        )}
      </div>
    )
    if (buttons.type === 'back') return (
      <button className="chat-menu-btn" onClick={() => send('Main Menu')} disabled={loading}
        style={{ marginTop:8, borderColor:'var(--border-2)', color:'var(--text-3)' }}>
        <ArrowLeft size={11} style={{ marginRight:4 }}/> Main Menu
      </button>
    )
  }

  if (!visible) return null

  const isFlying    = activityState === 'fly'
  const bobDuration = isSleeping ? 1 : (isFlying ? 0.4 : 2.5)

  return (
    <div style={{ position:'fixed', bottom:28, right:28, zIndex:9999, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:12 }}>

      {/* ── Chat window ── */}
      <AnimatePresence>
        {open && (
          <motion.div className="chatbot-window"
            initial={{ opacity:0, scale:0.88, y:20 }}
            animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:0.88, y:20 }}
            transition={{ type:'spring', stiffness:360, damping:28 }}
            style={{
              display:'flex', flexDirection:'column',
              border:`2px solid ${ACCENT}`, borderRadius:16,
              boxSizing:'border-box', overflow:'hidden',
              boxShadow:`0 0 24px rgba(255, 0, 212, 0.88)`,
              maxHeight:'calc(100vh - 120px)',
              width:460,
            }}
          >
            {/* Header */}
            <div className="chat-header" style={{ padding:'6px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                <div style={{ transform:'scale(0.32)', transformOrigin:'top left', width:28, height:36, overflow:'visible', flexShrink:0 }}>
                  <RealisticSpaceshipSVG isFlying={false} isSleeping={false}/>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:4 }}>
                  <div className="chat-header-title" style={{ lineHeight:1, margin:0, fontSize:'0.85rem' }}>Alchemy Assistant</div>
                  <div style={{
                    fontSize:9, fontFamily:'var(--font-mono)', display:'flex', alignItems:'center', gap:4,
                    color: loading ? ACCENT : '#22c55e',
                    background: loading ? `rgba(${ACCENT_RGB}, 0.10)` : 'rgba(34,197,94,0.12)',
                    padding:'1px 6px', borderRadius:10,
                    border: loading ? `1px solid rgba(${ACCENT_RGB},0.4)` : '1px solid rgba(34,197,94,0.3)',
                  }}>
                    {!loading && <div style={{ width:4, height:4, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 5px #22c55e' }}/>}
                    {loading ? 'Thinking...' : 'online'}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={reset} title="Reset conversation"
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', display:'flex', alignItems:'center' }}>
                  <RotateCcw size={13}/>
                </button>
                <button onClick={() => setOpen(false)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', display:'flex', alignItems:'center' }}>
                  <X size={14}/>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="chat-messages" style={{ flex:1, overflowY:'auto', minHeight:0 }}>
              {messages.map((m, i) => (
                <motion.div key={i} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.22 }}
                  className={`chat-msg ${m.role==='user' ? 'chat-msg-user' : 'chat-msg-bot'}`}>
                  {m.role === 'bot' ? (
                    <>
                      {m.typed || i !== typingIdx
                        ? <div dangerouslySetInnerHTML={{ __html: m.html }}/>
                        : <TypingMessage html={m.html}
                            onType={() => bottomRef.current?.scrollIntoView()}
                            onDone={() => {
                              setMessages(p => p.map((x,j) => j===i ? {...x, typed:true} : x))
                              setTypingIdx(null)
                            }}/>
                      }
                      {m.typed && renderButtons(m.buttons, i)}
                    </>
                  ) : m.text}
                </motion.div>
              ))}
              {loading && (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="chat-msg chat-msg-bot">
                  <ThinkingDots/>
                </motion.div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Input bar */}
            <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border-2)', display:'flex', gap:8, flexShrink:0 }}>
              <input type="text" value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && inputText.trim()) { send(inputText); setInputText('') } }}
                placeholder="Type a question..." disabled={loading}
                style={{ flex:1, padding:'8px 12px', borderRadius:6, border:'1px solid var(--border-2)', background:'var(--bg-2)', color:'var(--text)', outline:'none', fontSize:13 }}/>
              <motion.button whileTap={{ scale:0.9 }}
                onClick={() => { if (inputText.trim()) { send(inputText); setInputText('') } }}
                disabled={!inputText.trim() || loading}
                style={{ padding:8, background:inputText.trim()&&!loading ? ACCENT : 'var(--surface)', color:inputText.trim()&&!loading ? '#fff' : 'var(--text-3)', border:'none', borderRadius:6, cursor:inputText.trim()&&!loading ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
                <Send size={15}/>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Spaceship toggle area ── */}
      <div style={{ position:'relative', width:open?58:150, height:open?58:110, transition:'width 0.3s, height 0.3s' }}>
        <AnimatePresence mode="wait">
          {!open ? (
            <motion.div key="spaceship-roamer"
              initial={{ opacity:0 }}
              animate={{ opacity:1, x:isSleeping?-90:path.x, y:isSleeping?0:path.y }}
              exit={{ opacity:0, scale:0.5 }}
              transition={{
                opacity: { duration:0.3 },
                x: { duration:isFlying?10:(isSleeping?2:0.5), ease:'easeInOut', times:isFlying?[0,0.25,0.5,0.75,1]:undefined },
                y: { duration:isFlying?10:(isSleeping?2:0.5), ease:'easeInOut', times:isFlying?[0,0.25,0.5,0.75,1]:undefined },
              }}
              onClick={() => { if (isSleeping) setIsSleeping(false); setOpen(true) }}
              style={{ position:'absolute', right:0, bottom:0, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center' }}
            >
              {/* Ground shadow */}
              <motion.div
                animate={{ scaleX:isSleeping?1.4:(isFlying?[0.7,1.1,0.7]:[0.6,0.9,0.6]), scaleY:isSleeping?1.4:(isFlying?[0.7,1.1,0.7]:[0.6,0.9,0.6]), opacity:isSleeping?0.7:(isFlying?[0.1,0.3,0.1]:[0.1,0.3,0.1]) }}
                transition={{ duration:bobDuration, repeat:Infinity, ease:'easeInOut' }}
                style={{ position:'absolute', bottom:-10, left:'50%', transform:'translateX(-50%)', width:45, height:12, background:'rgba(0,0,0,1)', borderRadius:'50%', filter:'blur(5px)', zIndex:-1 }}
              />
              {/* Zzz */}
              <AnimatePresence>
                {isSleeping && (
                  <motion.div initial={{ opacity:0, y:0 }} animate={{ opacity:[0,1,0], y:-30, x:20, scale:[0.8,1.2,1] }}
                    transition={{ duration:2.5, repeat:Infinity }}
                    style={{ position:'absolute', top:-10, right:-5, color:ACCENT, fontWeight:'bold', fontSize:16, textShadow:`0 0 8px ${ACCENT}`, pointerEvents:'none', zIndex:10 }}>
                    Zzz
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Nudge bubble */}
              <AnimatePresence>
                {!isFlying && !isSleeping && nudge && (
                  <motion.div initial={{ opacity:0, y:8, scale:0.85 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:-6, scale:0.85 }}
                    transition={{ type:'spring', stiffness:340, damping:24 }}
                    style={{ position:'absolute', bottom:115, right:0, whiteSpace:'nowrap', background:'#0d1526', border:`1px solid ${ACCENT}`, borderRadius:10, padding:'6px 14px', fontSize:12, fontWeight:600, color:ACCENT, fontFamily:'var(--font-sans)', boxShadow:`0 0 20px rgba(${ACCENT_RGB},0.4)`, pointerEvents:'none', zIndex:10 }}>
                    {nudge}
                    <div style={{ position:'absolute', bottom:-6, right:30, width:12, height:7, clipPath:'polygon(0 0, 100% 0, 50% 100%)', background:ACCENT, opacity:0.9 }}/>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Spaceship */}
              <motion.div
                animate={{ y:isSleeping?30:(isFlying?[-2,2,-2]:[0,-10,0]), rotateY:isSleeping?180:path.rotateY, rotateZ:isSleeping?0:path.rotateZ }}
                transition={{ y:{ duration:bobDuration, repeat:Infinity, ease:'easeInOut' }, rotateY:{ duration:isFlying?10:0.8, ease:'easeInOut', times:isFlying?[0,0.25,0.5,0.75,1]:undefined }, rotateZ:{ duration:isFlying?10:0.5, ease:'easeInOut', times:isFlying?[0,0.25,0.5,0.75,1]:undefined } }}
                style={{ transformStyle:'preserve-3d', originX:'50%', originY:'60%' }}
              >
                <RealisticSpaceshipSVG isFlying={isFlying} isSleeping={isSleeping}/>
              </motion.div>
            </motion.div>
          ) : (
            <motion.button key="close-btn"
              initial={{ scale:0, rotate:-90, opacity:0 }}
              animate={{ scale:1, rotate:0, opacity:1 }}
              exit={{ scale:0, rotate:90, opacity:0 }}
              transition={{ type:'spring', stiffness:420, damping:22 }}
              onClick={() => setOpen(false)}
              title="Close Assistant"
              style={{ width:58, height:58, borderRadius:'50%', background:'var(--surface)', border:`2px solid ${ACCENT}`, boxShadow:`0 0 24px rgba(255, 0, 212, 0.88)`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
            >
              <X size={24} color={ACCENT}/>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
