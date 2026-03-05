def alchemy_bot_response(user_message):
    user_message = user_message.strip()

    responses = {
        # ==========================================
        # 0. NAVIGATION & SYSTEM
        # ==========================================
        "Main Menu": (
            "Returning to the main hub. Select a section to explore:"
        ),

        # ==========================================
        # 1. WELCOME HUB
        # ==========================================
        "Welcome": (
            "Welcome to <b>Data Alchemy</b>! 🔮 Your no-code AutoML platform.<br><br>"
            "On this screen you see the core promise: building powerful models in just a few clicks.<br>"
            "<ul>"
            "<li><b>Key Features</b> — lists the engines running under the hood.</li>"
            "<li><b>Quick Start</b> — your 4-step roadmap to a trained model.</li>"
            "</ul>"
            "<b>Your first step:</b> Click the red <b>🚀 Start Building Models</b> button, "
            "or navigate to <b>Upload Dataset</b> in the sidebar.<br><br>"
            "<i>💡 Pro Tip: Use the toggle in the sidebar bottom to switch between Light and Dark mode!</i>"
        ),
        "What is Hyperparameter Tuning?": (
            "Imagine tuning a radio to find the perfect signal — you need to turn the knobs just right. "
            "In machine learning, 'hyperparameters' are those knobs: things like learning rate, tree depth, or number of layers. "
            "Instead of you manually testing thousands of combinations, AutoGluon automatically searches for the settings that "
            "give the highest accuracy on your specific data."
        ),
        "Do I need coding skills?": (
            "Absolutely not! That is the entire point of Data Alchemy. "
            "The complex Python code using pandas, AutoFeat, and AutoGluon is completely hidden behind this interface. "
            "You just need to understand your data — the platform handles all the mathematics and programming."
        ),

        # ==========================================
        # 2. UPLOAD CSV SCREEN
        # ==========================================
        "Upload CSV": (
            "You are now in the <b>Upload Lab</b>! This is where your raw data enters the pipeline.<br><br>"
            "<b>How to use this screen:</b><br>"
            "1. Click <b>'Select your dataset file'</b> and choose your file.<br>"
            "2. Supported formats: <code>.csv</code>, <code>.xlsx</code>, <code>.xls</code><br>"
            "3. Click the blue <b>'⬆️ Upload File'</b> button.<br>"
            "4. Scroll down to verify the <b>Data Preview</b> table — it shows your first 10 rows.<br><br>"
            "<i>Note: Column names are automatically sanitized on upload "
            "(spaces become underscores, special characters are removed).</i>"
        ),
        "What is 'Sanitization'?": (
            "Raw data often has messy headers like <code>Monthly Income ($)</code>. "
            "Spaces and special symbols break many Python libraries. "
            "Upon upload, the platform converts that header to <code>Monthly_Income_USD</code> automatically. "
            "This ensures every tool in the pipeline works correctly."
        ),
        "Why only .csv files?": (
            "The platform actually supports <code>.csv</code>, <code>.xlsx</code>, and <code>.xls</code>. "
            "CSV is the most universal format for tabular data, but Excel files work too. "
            "All formats are internally converted to CSV for a consistent pipeline."
        ),
        "Preview box is empty?": (
            "The preview table only appears <i>after</i> you successfully select a file and click "
            "the blue <b>'⬆️ Upload File'</b> button. "
            "If the table is still empty after clicking, check that the file format is supported and try again."
        ),

        # ==========================================
        # 3. OPERATIONS SCREEN
        # ==========================================
        "Operations": (
            "Welcome to the <b>Operations Chamber</b>! This is where you refine your raw data.<br><br>"
            "<b>Your tools:</b><br>"
            "1. <b>🗑️ Remove Columns:</b> Click noisy columns in the list and press Remove. "
            "Hold <b>Ctrl</b> (or Cmd on Mac) to select multiple at once.<br>"
            "2. <b>🔄 Reset to Original:</b> Made a mistake? This restores your original uploaded file instantly.<br>"
            "3. <b>🚀 Feature Genius:</b> Runs AutoFeat to discover mathematical signals. "
            "After analysis, click <b>'+ Add to Dataset'</b> next to any suggested feature to include it.<br>"
            "4. <b>⚠️ Null Value Alert:</b> If the page shows a yellow warning, your data has missing values "
            "— consider removing those columns before training.<br><br>"
            "<b>Next Step:</b> Clean your data and click <b>➡️ Next: Exploration</b>!"
        ),
        "Which columns should I remove?": (
            "Remove columns that are unique identifiers or have no predictive value. Good candidates:<br>"
            "<ul>"
            "<li><b>ID columns</b> — e.g. <code>PassengerId</code>, <code>CustomerID</code></li>"
            "<li><b>Name columns</b> — e.g. <code>Name</code>, <code>Email</code></li>"
            "<li><b>Timestamp columns</b> — unless time-series prediction is your goal</li>"
            "<li><b>Free-text columns</b> — unless you are doing NLP</li>"
            "</ul>"
            "Keep columns that logically explain or correlate with what you are trying to predict."
        ),
        "What does Feature Genius do?": (
            "Powered by AutoFeat, it uses symbolic regression to test whether mathematical transformations "
            "of your numeric columns (like multiplying <code>Age × RoomService</code>, or squaring <code>Income</code>) "
            "create a stronger signal than the original columns alone.<br><br>"
            "<a href='https://github.com/cod3licious/autofeat' target='_blank'>📖 AutoFeat Repository</a>"
        ),
        "Is the Yellow Reset button safe?": (
            "Yes! When you first uploaded your CSV, the system secretly saved a pristine backup copy called "
            "<code>backup_dataset.csv</code>. Clicking Reset simply overwrites your current working file "
            "with that original backup. All your operations (dropped columns, added features) will be undone, "
            "but your original data is always preserved."
        ),
        "Can I download the processed data?": (
            "Yes! Your dataset is saved automatically after every operation. "
            "Once you have removed noisy columns and added new features, visit the "
            "<b>💾 Downloads</b> tab and click <b>📥 Download CSV</b> to export your upgraded dataset."
        ),

        # ==========================================
        # 4. EXPLORATION SCREEN
        # ==========================================
        "Exploration": (
            "Welcome to the <b>Exploration Hall</b>! 📊 Before training, you must verify your data is healthy.<br><br>"
            "Two powerful engines are available:<br>"
            "1. <b>▶️ Start D-Tale Engine:</b> Opens an interactive, spreadsheet-like interface. "
            "Filter, sort, chart, and detect outliers without writing any code.<br>"
            "2. <b>📊 Generate Profiling Report:</b> Automatically creates a comprehensive HTML report "
            "covering distributions, missing values, correlations, and duplicates.<br><br>"
            "<b>Critical Warning:</b> Look for 'Data Leakage' — columns that accidentally contain the answer "
            "you are trying to predict. Remove them in Operations before training!<br><br>"
            "<b>Next Step:</b> Audit your data, then click <b>➡️ Next: AutoML Forge</b>."
        ),
        "What is D-Tale & How do I use it?": (
            "D-Tale brings your data to life with an interactive interface. Key features:<br>"
            "<ul>"
            "<li>Filter rows by column values</li>"
            "<li>Build bar, line, scatter, and correlation charts</li>"
            "<li>Detect and highlight outliers</li>"
            "<li>View column-level statistics</li>"
            "</ul>"
            "<a href='https://dtale.readthedocs.io/' target='_blank'>📖 D-Tale Docs</a>"
        ),
        "What is Pandas (YData) Profiling?": (
            "YData Profiling automates Exploratory Data Analysis (EDA). In one click it generates a report showing:<br>"
            "<ul>"
            "<li>Distribution of every column (histograms, value counts)</li>"
            "<li>Missing value heatmaps</li>"
            "<li>Correlation matrices between all columns</li>"
            "<li>Duplicate row detection</li>"
            "</ul>"
            "<a href='https://docs.profiling.ydata.ai/' target='_blank'>📖 YData Profiling Docs</a>"
        ),
        "Can I download the Profiling Report?": (
            "Yes! After generating the report, a <b>📥 Download Report</b> button appears above the preview. "
            "The report is also available from the <b>💾 Downloads</b> tab. "
            "It is a standalone <code>.html</code> file you can open in any browser offline."
        ),
        "Why is Exploration necessary?": (
            "If you feed an AI 'garbage', it learns garbage. Skipping this step is the most common beginner mistake.<br><br>"
            "Exploration helps you find:<br>"
            "<ul>"
            "<li><b>Data Leakage</b> — accidentally including the answer in your features</li>"
            "<li><b>Skewed distributions</b> — features that may need transformation</li>"
            "<li><b>High correlation</b> — redundant columns that add noise</li>"
            "<li><b>Missing values</b> — gaps that could break model training</li>"
            "</ul>"
        ),

        # ==========================================
        # 5. AUTOML FORGE SCREEN
        # ==========================================
        "AutoML Forge": (
            "Welcome to the <b>AutoML Forge</b>! 🤖 Your command center for building a custom AI model.<br><br>"
            "Configure 6 dials before launching:<br>"
            "1. <b>Target Column</b> — what the AI will predict<br>"
            "2. <b>Problem Type</b> — classification or regression?<br>"
            "3. <b>Evaluation Metric</b> — how the AI grades its own accuracy<br>"
            "4. <b>Holdout Fraction</b> — data reserved for the final exam<br>"
            "5. <b>Model Quality Preset</b> — depth of the ensemble<br>"
            "6. <b>Time Limit</b> — maximum forge burn time in seconds<br><br>"
            "<b>After training:</b> A <b>🏆 Leaderboard</b> ranks every algorithm tested. "
            "The best model is automatically saved and ready to download."
        ),
        "What is AutoGluon?": (
            "AutoGluon is an open-source AutoML library by Amazon. It automates the full ML pipeline:<br>"
            "<ul>"
            "<li><b>Model Selection</b> — tests XGBoost, LightGBM, CatBoost, Neural Nets, and more</li>"
            "<li><b>Hyperparameter Search</b> — Bayesian optimization to tune every model</li>"
            "<li><b>Stacking Ensembles</b> — combines the best models for higher accuracy</li>"
            "<li><b>Time-Bounded Training</b> — respects your time limit setting exactly</li>"
            "</ul>"
            "<a href='https://auto.gluon.ai/' target='_blank'>📖 AutoGluon Docs</a> | "
            "<a href='https://www.youtube.com/results?search_query=autogluon+tutorial' target='_blank'>▶️ Watch on YouTube</a>"
        ),
        "1. Choosing a Target & Problem Type?": (
            "The <b>Target Column</b> is the answer column — what you want to predict.<br><br>"
            "<b>Problem Type Guide:</b><br>"
            "<ul>"
            "<li><b>Auto-detect:</b> Let AutoGluon decide (recommended for beginners)</li>"
            "<li><b>Binary:</b> Target has 2 options (Yes/No, True/False, 0/1)</li>"
            "<li><b>Multiclass:</b> Target has 3+ categories (e.g. Low/Medium/High)</li>"
            "<li><b>Regression:</b> Target is a continuous number (Price, Age, Temperature)</li>"
            "</ul>"
            "<b>⚠️ Warning:</b> If your target contains text labels, you cannot use Regression."
        ),
        "2. What is an Evaluation Metric?": (
            "The grading rubric that tells the model what 'winning' means.<br><br>"
            "<b>For Classification:</b><br>"
            "<ul>"
            "<li><code>Accuracy</code> — % of correct predictions (use for balanced classes)</li>"
            "<li><code>F1 Score</code> — balances precision and recall (use for imbalanced classes)</li>"
            "<li><code>ROC AUC</code> — discrimination ability between classes</li>"
            "</ul>"
            "<b>For Regression:</b><br>"
            "<ul>"
            "<li><code>RMSE</code> — penalizes large errors heavily</li>"
            "<li><code>MAE</code> — treats all errors equally</li>"
            "<li><code>R²</code> — how much variance the model explains (1.0 is perfect)</li>"
            "</ul>"
        ),
        "3. What is the Holdout Fraction?": (
            "The Holdout Fraction reserves a portion of your data that the model <i>never sees</i> during training. "
            "After training, this hidden set is used for the 'final exam' to measure true accuracy.<br><br>"
            "<b>Default: 20%</b> — the model trains on 80% and is tested on the remaining 20%.<br><br>"
            "Too low (e.g. 5%) → unreliable accuracy estimate<br>"
            "Too high (e.g. 40%) → less data to train on, weaker model"
        ),
        "4. Which Model Quality should I pick?": (
            "Higher quality = more models stacked = longer training time.<br><br>"
            "<ul>"
            "<li><b>Very Light / Light:</b> Fastest, good for quick prototypes</li>"
            "<li><b>Medium Quality:</b> Default. Solid baseline in 5 minutes</li>"
            "<li><b>Good / High Quality:</b> Noticeably better accuracy</li>"
            "<li><b>Best Quality / Extreme:</b> Maximum accuracy — allow 30–60 min and increase time limit</li>"
            "<li><b>Interpretable:</b> Only trains glass-box models (for regulatory/explainability needs)</li>"
            "<li><b>Optimize for Deployment:</b> Small, fast models ready for production APIs</li>"
            "</ul>"
        ),
        "5. Setting the Time Limit?": (
            "The hard deadline for the entire training run. AutoGluon will stop after this many seconds, "
            "keeping the best model found so far.<br><br>"
            "<b>Recommended settings:</b><br>"
            "<ul>"
            "<li><code>Medium Quality</code>: 120–300 seconds</li>"
            "<li><code>High / Best Quality</code>: 600–1800 seconds</li>"
            "<li><code>Extreme</code>: 3600+ seconds (1 hour or more)</li>"
            "</ul>"
            "If training stops before the progress bar fills, it means AutoGluon finished early — that is normal!"
        ),

        # ==========================================
        # 6. DOWNLOADS (THE VAULT) SCREEN
        # ==========================================
        "Downloads": (
            "Welcome to <b>The Vault</b>! 💾 Collect the Trinity of Results:<br><br>"
            "1. <b>📊 Processed Dataset</b> — your cleaned, feature-engineered CSV<br>"
            "2. <b>🤖 AutoGluon Model</b> — the full trained ensemble as a ZIP archive<br>"
            "3. <b>📋 Profiling Report</b> — the interactive HTML statistical audit<br><br>"
            "<b>Seeing a disabled button?</b> That means you skipped that step. "
            "You can always go back and generate the missing artifact!"
        ),
        "Why is the model a .zip file?": (
            "An AutoGluon ensemble is not a single file — it is an entire directory! "
            "It contains preprocessors, metadata, and individual sub-folders for every algorithm that was trained "
            "(XGBoost, LightGBM, Neural Networks, etc.). "
            "Zipping ensures all files are bundled together without any critical components being lost."
        ),
        "What exactly does the ZIP contain?": (
            "After extracting the ZIP you will find:<br>"
            "<ul>"
            "<li><code>predictor.pkl</code> — the master object that loads everything</li>"
            "<li><code>learner.pkl</code> — the ensemble voting logic</li>"
            "<li><code>models/</code> — subdirectory with trained weights for every algorithm</li>"
            "<li><code>metadata.json</code> — feature names, target column, problem type</li>"
            "</ul>"
            "To use the model: <code>from autogluon.tabular import TabularPredictor; "
            "p = TabularPredictor.load('path/to/folder')</code>"
        ),
        "Why download the Processed CSV?": (
            "After using Feature Genius and dropping noisy columns, your dataset is permanently upgraded. "
            "Downloading this clean file lets you:<br>"
            "<ul>"
            "<li>Build dashboards in Tableau or Power BI</li>"
            "<li>Use it in other ML frameworks outside Data Alchemy</li>"
            "<li>Share a clean, documented dataset with your team</li>"
            "</ul>"
        ),
        "What do I do with the Profiling Report?": (
            "Open the downloaded <code>.html</code> file in any web browser (Chrome, Edge, Firefox) — "
            "even without an internet connection. "
            "It serves as your official <b>Statistical Certificate</b>, proving your data was explored and validated "
            "before model training. Share it with stakeholders or include it in project documentation."
        ),

        # ==========================================
        # 7. DEPLOYMENT SCREEN
        # ==========================================

        "What Next ?": (
            "Welcome to the <b>Deployment Arena</b>! 🚀 You now have a ZIP generated by Data Alchemy. "
            "This package contains everything needed to move from training to deployment.<br><br>"
            "Inside you’ll find:<br>"
            "• <code>autogluon_models/</code> — all trained algorithms and weights.<br>"
            "• <code>autofeat_model.pkl</code> — the feature engineering pipeline.<br>"
            "• <code>features_eng.json</code> — metadata describing transformations.<br>"
            "• <b>README</b> — step‑by‑step usage guide.<br><br>"
            "From here, you can explore each file, learn how to use them, or choose the simpler path with <b>Deploy Alchemy</b>."
        ),

        "What is inside my Data Alchemy ZIP ?": (
            "Your Data Alchemy ZIP contains four key components:<br><br>"
            "1. <code>autogluon_models/</code> — a folder with all trained models, weights, and metadata.<br>"
            "2. <code>autofeat_model.pkl</code> — the serialized AutoFeat pipeline for feature engineering.<br>"
            "3. <code>features_eng.json</code> — a JSON file describing column transformations and engineered features.<br>"
            "4. <b>README</b> — instructions on how to load and use these files.<br><br>"
            "Together, these files let you reproduce training, run predictions, or prepare for deployment."
        ),

        "What is in the models folder ?": (
            "The <code>autogluon_models/</code> directory is the heart of your trained ensemble:<br><br>"
            "• Sub‑folders for each algorithm (XGBoost, LightGBM, Neural Nets, etc.).<br>"
            "• Trained weights and checkpoints.<br>"
            "• Metadata files describing target column, problem type, and evaluation metrics.<br><br>"
            "This folder ensures every model tested during training can be reloaded or stacked for predictions."
        ),

        "What is in the .pkl and .json files ?": (
            "• <code>autofeat_model.pkl</code> — a serialized Python object containing the AutoFeat feature engineering pipeline. "
            "It knows how to transform raw columns into engineered signals.<br>"
            "• <code>features_eng.json</code> — a JSON file listing all transformations applied (e.g., squared income, age × service). "
            "This acts as documentation and ensures consistency when applying the same transformations to new data."
        ),

        "How do I use these files ?": (
            "You can load and use the files directly:<br><br>"
            "• In Python: <code>from autogluon.tabular import TabularPredictor; p = TabularPredictor.load('autogluon_models')</code><br>"
            "• Apply <code>autofeat_model.pkl</code> to transform new datasets before prediction.<br>"
            "• Use <code>features_eng.json</code> as a reference to ensure your new data matches the training schema.<br><br>"
            "But let’s be honest — this can feel like too much if you’re not coding. "
            "That’s why we built a simpler option."
        ),

        "Is there a simpler way to use this ?": (
            "Yes! That’s exactly what <b>Deploy Alchemy</b> is for. "
            "Instead of manually loading models and pipelines, you just upload the Data Alchemy ZIP. "
            "Deploy Alchemy automatically builds a deployable service with prediction windows and an API endpoint.<br><br>"
            "And it doesn’t stop there — it also carries over all the critical information from your training run:<br>"
            "• Which model was chosen as the best performer.<br>"
            "• The full <b>Leaderboard</b> of algorithms tested.<br>"
            "• Accuracy, F1, RMSE, and other evaluation metrics.<br>"
            "• Metadata about your target column and features.<br><br>"
            "So when you deploy, you don’t just get a prediction tool — you get a complete snapshot of your model’s performance and history."
        ),

        "How does Deploy Alchemy actually deploy my model ?": (
            "Deploy Alchemy follows a clear procedure to transform your training ZIP into a live, deployable package:<br><br>"
            "1. <b>Upload</b> your Data Alchemy ZIP (containing <code>autogluon_models/</code>, <code>autofeat_model.pkl</code>, <code>features_eng.json</code>, and README).<br>"
            "2. <b>Extract & Validate</b> — the system unpacks the files, checks consistency, and ensures the model can be loaded.<br>"
            "3. <b>Build Deployment Interface</b> — it generates a new Deployment ZIP with ready‑to‑use windows:<br>"
            "   • Welcome Window — confirms the model is loaded.<br>"
            "   • Single Prediction Window — paste one row of data for instant prediction.<br>"
            "   • Batch Prediction Window — upload a CSV for bulk predictions.<br>"
            "   • Test Model Window — validate accuracy with sample data.<br>"
            "4. <b>Bundle Metadata</b> — includes leaderboard, metrics, and feature info so you know exactly what’s running.<br>"
            "5. <b>Deliver ZIP</b> — you download the deployable package, extract it, and follow the README to go live.<br><br>"
            "<i>💡 In short: you hand Deploy Alchemy your training ZIP, and it hands you back a plug‑and‑play deployment ZIP — no coding required.</i>"
        ),  

    }

    result = responses.get(user_message)

    if result:
        return result

    # Fuzzy fallback — try to match partial topic keywords
    user_lower = user_message.lower()
    keyword_map = {
                # AutoGluon (short and full variants)
                "auto": responses.get("What is AutoGluon?"),
                "autogluon": responses.get("What is AutoGluon?"),
                "auto gluon": responses.get("What is AutoGluon?"),
                "autogluon docs": responses.get("What is AutoGluon?"),
                "autogluon info": responses.get("What is AutoGluon?"),
                "ensemble": responses.get("What is AutoGluon?"),
                "model ensemble": responses.get("What is AutoGluon?"),

                # Feature Genius / AutoFeat
                "feat": responses.get("What does Feature Genius do?"),
                "autofeat": responses.get("What does Feature Genius do?"),
                "auto feat": responses.get("What does Feature Genius do?"),
                "feature": responses.get("What does Feature Genius do?"),
                "feature genius": responses.get("What does Feature Genius do?"),
                "feature engineering": responses.get("What does Feature Genius do?"),
                "feature repo": responses.get("What does Feature Genius do?"),

                # Target / Problem type
                "target": responses.get("1. Choosing a Target & Problem Type?"),
                "target column": responses.get("1. Choosing a Target & Problem Type?"),
                "problem": responses.get("1. Choosing a Target & Problem Type?"),
                "problem type": responses.get("1. Choosing a Target & Problem Type?"),
                "choose target": responses.get("1. Choosing a Target & Problem Type?"),

                # Evaluation metric
                "metric": responses.get("2. What is an Evaluation Metric?"),
                "evaluation": responses.get("2. What is an Evaluation Metric?"),
                "eval": responses.get("2. What is an Evaluation Metric?"),
                "evaluation metric": responses.get("2. What is an Evaluation Metric?"),

                # Holdout / split
                "holdout": responses.get("3. What is the Holdout Fraction?"),
                "holdout fraction": responses.get("3. What is the Holdout Fraction?"),
                "split": responses.get("3. What is the Holdout Fraction?"),
                "train test split": responses.get("3. What is the Holdout Fraction?"),

                # Model quality / preset
                "preset": responses.get("4. Which Model Quality should I pick?"),
                "quality": responses.get("4. Which Model Quality should I pick?"),
                "model quality": responses.get("4. Which Model Quality should I pick?"),
                "preset quality": responses.get("4. Which Model Quality should I pick?"),

                # Time limit / timeout
                "time": responses.get("5. Setting the Time Limit?"),
                "time limit": responses.get("5. Setting the Time Limit?"),
                "timeout": responses.get("5. Setting the Time Limit?"),
                "training time": responses.get("5. Setting the Time Limit?"),

                # D-Tale / outliers / interactive explorer
                "dtale": responses.get("What is D-Tale & How do I use it?"),
                "d tale": responses.get("What is D-Tale & How do I use it?"),
                "d tale docs": responses.get("What is D-Tale & How do I use it?"),
                "outlier": responses.get("What is D-Tale & How do I use it?"),
                "outliers": responses.get("What is D-Tale & How do I use it?"),
                "explorer": responses.get("What is D-Tale & How do I use it?"),

                # Profiling / EDA
                "profile": responses.get("What is Pandas (YData) Profiling?"),
                "profiling": responses.get("What is Pandas (YData) Profiling?"),
                "eda": responses.get("Exploration"),
                "exploration": responses.get("Exploration"),
                "profiling report": responses.get("What is Pandas (YData) Profiling?"),

                # Reset / backup
                "reset": responses.get("Is the Yellow Reset button safe?"),
                "reset backup": responses.get("Is the Yellow Reset button safe?"),
                "backup": responses.get("Is the Yellow Reset button safe?"),
                "undo": responses.get("Is the Yellow Reset button safe?"),

                # Leakage / why explore
                "leak": responses.get("Why is Exploration necessary?"),
                "leakage": responses.get("Why is Exploration necessary?"),
                "data leak": responses.get("Why is Exploration necessary?"),
                "why explore": responses.get("Why is Exploration necessary?"),
                "why exploration": responses.get("Why is Exploration necessary?"),

                # ZIP / model archive / contents
                "zip": responses.get("Why is the model a .zip file?"),
                "model zip": responses.get("Why is the model a .zip file?"),
                "zip contents": responses.get("What is inside my Data Alchemy ZIP ?"),
                "zip content": responses.get("What is inside my Data Alchemy ZIP ?"),
                "what inside zip": responses.get("What is inside my Data Alchemy ZIP ?"),
                "models folder": responses.get("What is in the models folder ?"),
                "pkl json": responses.get("What is in the .pkl and .json files ?"),
                "pkl": responses.get("What is in the .pkl and .json files ?"),
                "json": responses.get("What is in the .pkl and .json files ?"),
                "readme": responses.get("What is inside my Data Alchemy ZIP ?"),

                # Downloads / processed csv / report
                "download": responses.get("Downloads"),
                "downloads": responses.get("Downloads"),
                "download csv": responses.get("Can I download the processed data?"),
                "processed csv": responses.get("Can I download the processed data?"),
                "download report": responses.get("Can I download the Profiling Report?"),
                "profiling report download": responses.get("Can I download the Profiling Report?"),

                # Sanitization / clean headers
                "sanitize": responses.get("What is 'Sanitization'?"),
                "sanitization": responses.get("What is 'Sanitization'?"),
                "clean headers": responses.get("What is 'Sanitization'?"),
                "clean": responses.get("What is 'Sanitization'?"),

                # Columns / drop / remove
                "dropcol": responses.get("Which columns should I remove?"),
                "drop column": responses.get("Which columns should I remove?"),
                "drop columns": responses.get("Which columns should I remove?"),
                "columns": responses.get("Which columns should I remove?"),
                "remove column": responses.get("Which columns should I remove?"),
                "remove columns": responses.get("Which columns should I remove?"),

                # Operations / null / missing
                "ops": responses.get("Operations"),
                "operations": responses.get("Operations"),
                "null": responses.get("Operations"),
                "missing": responses.get("Operations"),
                "missing values": responses.get("Operations"),
                "null values": responses.get("Operations"),

                # Deploy / how to use files / simpler way
                "deploy": responses.get("What Next ?"),
                "deploy alchemy": responses.get("What Next ?"),
                "deploy process": responses.get("How does Deploy Alchemy actually deploy my model ?"),
                "deploy steps": responses.get("How does Deploy Alchemy actually deploy my model ?"),
                "how to deploy": responses.get("How does Deploy Alchemy actually deploy my model ?"),
                "how to use files": responses.get("How do I use these files ?"),
                "use files": responses.get("How do I use these files ?"),
                "simpler way": responses.get("Is there a simpler way to use this ?"),

                # General / welcome / help
                "welcome": responses.get("Welcome"),
                "main": responses.get("Main Menu"),
                "menu": responses.get("Main Menu"),
                "help": responses.get("Main Menu"),
                "info": responses.get("Welcome"),
}


    for keyword, answer in keyword_map.items():
        if keyword in user_lower and answer:
            return (
                f"<i>Matched your question to a related topic:</i><br><br>{answer}"
            )

    return (
        "I am the <b>Alchemy Assistant</b>. I didn't recognize that specific question, "
        "but I can help with any topic from the menu below. "
        "Try selecting the section you are currently viewing for step-by-step guidance!"
    )