import React from 'react';

export const translations = {
  en: {
    loadingConfig: "Loading configuration...",
    dbConnectionError: "Database Connection Error",
    dbConnectionErrorDesc: (
      <>Please ensure you have configured your <b>MONGODB_URI</b> in <code>.env.local</code> or that a local MongoDB instance is running on port 27017.</>
    ),
    dataPrivacyDisclaimer: "Data Privacy Disclaimer",
    completeAnonymity: "Complete Anonymity",
    completeAnonymityDesc: (
      <>We do <strong>not</strong> collect any Personal Identifiable Information (PII) like names, IP addresses, emails, or exact locations. All data is completely anonymized. It is impossible to link the mouse tracking data back to you personally.</>
    ),
    purposeOfStudy: "Purpose of the Study",
    purposeOfStudyDesc: ({ courseName, universityName }) => (
      <>This data is collected purely for a university project in the <em>{courseName}</em> course at <strong>{universityName}</strong> to analyze motor adaptation strategies.</>
    ),
    secureDataHandling: "Secure Data Handling",
    secureDataHandlingDesc: "The data will be stored securely in our database, viewed only by the project team/course instructor, and deleted after the project is graded.",
    voluntaryParticipation: "Voluntary Participation & Withdrawal",
    voluntaryParticipationDesc: "Participation is completely voluntary. You can stop the experiment at any time by closing the tab. No data will be saved if you quit early.",
    contactInfo: "If you have any questions, you can contact the project student team at: ",
    mouseKinematicsStudy: "Mouse Kinematics Study",
    selectInputDevice: "Select your input device and accept the consent terms to start.",
    inputDevice: "Input Device",
    mouse: "Mouse",
    trackpad: "Trackpad",
    consentText: "I agree to participate in this study. I understand that my interaction data (mouse movements, response times) will be collected anonymously and used solely for academic purposes. I can close the browser at any time to withdraw.",
    startExperiment: "Start Experiment",
    howToPlay: "How to Play",
    lockYourCursor: "Lock Your Cursor",
    lockYourCursorDesc: (
      <>When the task starts, you will see a canvas. <strong>Click anywhere on it</strong> to lock your mouse cursor inside the game window. You can press <kbd className="bg-slate-100 border border-slate-200 px-1 rounded mx-1">ESC</kbd> at any time if you need to pause or unlock your mouse.</>
    ),
    startTheTrial: "Start the Trial",
    startTheTrialDesc: (
      <>Move your red cursor into the <strong>black starting circle</strong> in the very center. Hold it there until a blue target circle appears on the edge of the screen.</>
    ),
    shootForTheTarget: "Shoot for the Target!",
    shootForTheTargetDesc: "Move your cursor directly into the blue target as fast and as straight as you can. Sometimes the cursor might behave unpredictably (like a mirror or rotated controls) — try your best to adapt!",
    iUnderstandLetsGo: "I Understand, Let's Go!",
    blockCompleted: "Block Completed!",
    greatJobConquered: "Great job! You have conquered this block.",
    accuracy: "Accuracy",
    avgSpeed: "Avg Speed",
    score: "Score",
    startNextBlock: "Start Next Block",
    pleaseWait: "Please Wait...",
    postExperimentQuestionnaire: "Post-Experiment Questionnaire",
    pleaseProvideWrittenAnswer: "Please provide a written answer for:",
    pleaseTypeYourAnswerHere: "Please type your answer here...",
    selectAnOption: "-- Select an option --",
    submitAnswers: "Submit Answers",
    thankYou: "Thank You! 🎉",
    successfullyCompleted: "You've successfully completed the entire experiment.",
    participationProvidesInvaluable: "Your participation provides invaluable data for our motor learning research. You may now close this browser tab. Have a wonderful day!",
    taskReaching: "Task: Reaching",
    taskPathTracking: "Task: Path Tracking",
    trialXofY: ({ current, total }) => `Trial ${current} of ${total}`,
    clickCanvasToStart: (
      <><strong>Click the canvas</strong> to start. Press <kbd className="bg-white border border-blue-200 px-1 rounded shadow-sm">ESC</kbd> to pause.</>
    )
  },
  de: {
    loadingConfig: "Konfiguration wird geladen...",
    dbConnectionError: "Datenbankverbindungsfehler",
    dbConnectionErrorDesc: (
      <>Bitte stellen Sie sicher, dass Sie Ihre <b>MONGODB_URI</b> in <code>.env.local</code> konfiguriert haben oder dass eine lokale MongoDB-Instanz auf Port 27017 läuft.</>
    ),
    dataPrivacyDisclaimer: "Datenschutzhinweis",
    completeAnonymity: "Vollständige Anonymität",
    completeAnonymityDesc: (
      <>Wir sammeln <strong>keine</strong> personenbezogenen Daten (PII) wie Namen, IP-Adressen, E-Mails oder genaue Standorte. Alle Daten sind vollständig anonymisiert. Es ist unmöglich, die Mausverfolgungsdaten auf Sie persönlich zurückzuführen.</>
    ),
    purposeOfStudy: "Zweck der Studie",
    purposeOfStudyDesc: ({ courseName, universityName }) => (
      <>Diese Daten werden ausschließlich für ein Universitätsprojekt im Kurs <em>{courseName}</em> an der <strong>{universityName}</strong> gesammelt, um motorische Anpassungsstrategien zu analysieren.</>
    ),
    secureDataHandling: "Sicherer Umgang mit Daten",
    secureDataHandlingDesc: "Die Daten werden sicher in unserer Datenbank gespeichert, nur vom Projektteam/Kursleiter eingesehen und nach der Benotung des Projekts gelöscht.",
    voluntaryParticipation: "Freiwillige Teilnahme & Widerruf",
    voluntaryParticipationDesc: "Die Teilnahme ist völlig freiwillig. Sie können das Experiment jederzeit abbrechen, indem Sie den Tab schließen. Wenn Sie vorzeitig abbrechen, werden keine Daten gespeichert.",
    contactInfo: "Wenn Sie Fragen haben, können Sie das Projektstudententeam kontaktieren unter: ",
    mouseKinematicsStudy: "Studie zur Mauskinematik",
    selectInputDevice: "Wählen Sie Ihr Eingabegerät und akzeptieren Sie die Teilnahmebedingungen, um zu beginnen.",
    inputDevice: "Eingabegerät",
    mouse: "Maus",
    trackpad: "Trackpad",
    consentText: "Ich stimme der Teilnahme an dieser Studie zu. Ich verstehe, dass meine Interaktionsdaten (Mausbewegungen, Reaktionszeiten) anonym erhoben und ausschließlich für akademische Zwecke verwendet werden. Ich kann den Browser jederzeit schließen, um mich zurückzuziehen.",
    startExperiment: "Experiment Starten",
    howToPlay: "Spielanleitung",
    lockYourCursor: "Sperren Sie Ihren Cursor",
    lockYourCursorDesc: (
      <>Wenn die Aufgabe beginnt, sehen Sie eine Zeichenfläche. <strong>Klicken Sie irgendwo darauf</strong>, um Ihren Mauszeiger im Spielfenster zu sperren. Sie können jederzeit <kbd className="bg-slate-100 border border-slate-200 px-1 rounded mx-1">ESC</kbd> drücken, wenn Sie pausieren oder Ihre Maus entsperren möchten.</>
    ),
    startTheTrial: "Starten Sie den Versuch",
    startTheTrialDesc: (
      <>Bewegen Sie Ihren roten Cursor in den <strong>schwarzen Startkreis</strong> in der Mitte. Halten Sie ihn dort, bis ein blauer Zielkreis am Rand des Bildschirms erscheint.</>
    ),
    shootForTheTarget: "Zielen Sie auf das Ziel!",
    shootForTheTargetDesc: "Bewegen Sie Ihren Cursor so schnell und gerade wie möglich direkt in das blaue Ziel. Manchmal verhält sich der Cursor unvorhersehbar (wie ein Spiegel oder gedrehte Steuerelemente) — versuchen Sie Ihr Bestes, sich anzupassen!",
    iUnderstandLetsGo: "Ich verstehe, los geht's!",
    blockCompleted: "Block Abgeschlossen!",
    greatJobConquered: "Gute Arbeit! Sie haben diesen Block gemeistert.",
    accuracy: "Genauigkeit",
    avgSpeed: "Durchschn. Geschw.",
    score: "Punktzahl",
    startNextBlock: "Nächsten Block Starten",
    pleaseWait: "Bitte warten...",
    postExperimentQuestionnaire: "Fragebogen nach dem Experiment",
    pleaseProvideWrittenAnswer: "Bitte geben Sie eine schriftliche Antwort für:",
    pleaseTypeYourAnswerHere: "Bitte geben Sie hier Ihre Antwort ein...",
    selectAnOption: "-- Wählen Sie eine Option --",
    submitAnswers: "Antworten Einreichen",
    thankYou: "Vielen Dank! 🎉",
    successfullyCompleted: "Sie haben das gesamte Experiment erfolgreich abgeschlossen.",
    participationProvidesInvaluable: "Ihre Teilnahme liefert unschätzbare Daten für unsere motorische Lernforschung. Sie können diesen Browser-Tab nun schließen. Einen schönen Tag noch!",
    taskReaching: "Aufgabe: Greifen",
    taskPathTracking: "Aufgabe: Pfadverfolgung",
    trialXofY: ({ current, total }) => `Versuch ${current} von ${total}`,
    clickCanvasToStart: (
      <><strong>Klicken Sie auf die Zeichenfläche</strong>, um zu beginnen. Drücken Sie <kbd className="bg-white border border-blue-200 px-1 rounded shadow-sm">ESC</kbd> zum Pausieren.</>
    )
  }
};
