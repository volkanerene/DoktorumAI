<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

$debug = [];

function debugLog($message) {
    global $debug;
    $debug[] = $message;
}



$conn = new mysqli($servername, $username, $password, $dbname);
$conn->set_charset("utf8mb4");

if ($conn->connect_error) {
    echo json_encode(["error" => "Connection failed: " . $conn->connect_error, "debug" => $debug]);
    exit;
}
debugLog("Connected to DB successfully.");

function handleError($msg) {
    global $debug;
    echo json_encode(["error" => $msg, "debug" => $debug]);
    exit;
}

function hashPassword($plain) {
    return password_hash($plain, PASSWORD_BCRYPT);
}

function verifyPassword($plain, $hashed) {
    return password_verify($plain, $hashed);
}

/**
 * Fetch user profile info: photo + answers
 */
function getUserProfile($userId) {
    global $conn, $debug;
    $stmt = $conn->prepare("SELECT profile_photo, answers, language FROM user_profile WHERE user_id = ? LIMIT 1");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();
    if (!$row) {
        debugLog("No user_profile found for user_id=$userId");
        return null;
    }
    return $row;
}

/**
 * callOpenAI with GPT-4 Vision support
 * @param int    $userId      The user ID
 * @param string $specialty   The medical specialty
 * @param string $userMessage The user question or message
 * @param string $language    The language (tr or en)
 * @param array  $imageData   Optional image data for vision analysis
 */
function callOpenAI($userId, $specialty, $userMessage, $language = 'tr', $imageData = null) {
    global $OPENAI_API_KEY, $debug, $conn;

    debugLog("callOpenAI triggered with specialty=$specialty, language=$language, userId=$userId");

    // 1) Fetch user profile
    $profileData = getUserProfile($userId);
    
    // Determine system prompt based on language
    if ($language === 'en') {
        $systemPrompt = getEnglishSystemPrompt();
    } else {
        $systemPrompt = getTurkishSystemPrompt();
    }

    // Build messages array
    $messages = [
        ["role" => "system", "content" => $systemPrompt]
    ];

    // If image data is provided, use GPT-4 Vision
    if ($imageData) {
        $messages[] = [
            "role" => "user",
            "content" => [
                [
                    "type" => "text",
                    "text" => $userMessage
                ],
                [
                    "type" => "image_url",
                    "image_url" => [
                        "url" => "data:image/jpeg;base64," . $imageData
                    ]
                ]
            ]
        ];
        $model = "gpt-4-turbo";
    } else {
        $messages[] = ["role" => "user", "content" => $userMessage];
        $model = "gpt-4-turbo";
    }

    $postData = [
        "model" => $model,
        "messages" => $messages,
        "temperature" => 0.7,
        "max_tokens" => 1500
    ];

    $ch = curl_init("https://api.openai.com/v1/chat/completions");
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Content-Type: application/json",
        "Authorization: Bearer $OPENAI_API_KEY"
    ]);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response   = curl_exec($ch);
    $httpCode   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError  = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        debugLog("OpenAI cURL error: $curlError");
        return "OpenAI cURL error: $curlError";
    }
    if ($httpCode >= 400) {
        debugLog("OpenAI error, HTTP status=$httpCode, resp=$response");
        return "OpenAI error, HTTP status = $httpCode";
    }

    $json = json_decode($response, true);
    if (!$json) {
        debugLog("Invalid JSON from OpenAI: $response");
        return $language === 'en' ? "Invalid response." : "Geçersiz cevap.";
    }
    
    $assistantReply = $json["choices"][0]["message"]["content"] ?? ($language === 'en' ? "No response received." : "Cevap alınamadı.");
    debugLog("OpenAI success reply length=" . strlen($assistantReply));
    
    // Parse for specialist recommendations if this is from Family Assistant
    if ($specialty === 'Family Assistant' || $specialty === 'Aile Asistanı') {
        $assistantReply = parseSpecialistRecommendations($assistantReply, $language);
    }
    
    return $assistantReply;
}

function parseSpecialistRecommendations($reply, $language) {
    // Yanıt içinde uzman önerilerini ara
    $pattern = '/\[Uzman Önerisi:\s*([^\]]+)\]/i';
    if ($language === 'en') {
        $pattern = '/\[Specialist Recommendation:\s*([^\]]+)\]/i';
    }
    
    preg_match_all($pattern, $reply, $matches);
    
    if (!empty($matches[1])) {
        $recommendations = [];
        
        foreach ($matches[1] as $specialist) {
            $specialist = trim(strtolower($specialist));
            
            // Türkçe ve İngilizce eşleştirmeler
            $specialistMap = [
                // Türkçe
                'kardiyoloji' => 'assistants.cardiology',
                'dermatoloji' => 'assistants.dermatology',
                'pediatri' => 'assistants.pediatrics',
                'çocuk' => 'assistants.pediatrics',
                'psikoloji' => 'assistants.psychology',
                'nöroloji' => 'assistants.neurology',
                'ortopedi' => 'assistants.orthopedics',
                'üroloji' => 'assistants.urology',
                'göz' => 'assistants.ophthalmology',
                'kadın doğum' => 'assistants.gynecology',
                'kulak burun boğaz' => 'assistants.ent',
                'kbb' => 'assistants.ent',
                'endokrinoloji' => 'assistants.endocrinology',
                'gastroenteroloji' => 'assistants.gastroenterology',
                'hematoloji' => 'assistants.hematology',
                'nefroloji' => 'assistants.nephrology',
                'romatoloji' => 'assistants.rheumatology',
                'diş' => 'assistants.dental',
                'beslenme' => 'assistants.nutrition',
                'onkoloji' => 'assistants.oncology',
                'alerji' => 'assistants.allergy',
                'göğüs' => 'assistants.pulmonology',
                
                // English
                'cardiology' => 'assistants.cardiology',
                'dermatology' => 'assistants.dermatology',
                'pediatrics' => 'assistants.pediatrics',
                'psychology' => 'assistants.psychology',
                'neurology' => 'assistants.neurology',
                'orthopedics' => 'assistants.orthopedics',
                'urology' => 'assistants.urology',
                'ophthalmology' => 'assistants.ophthalmology',
                'gynecology' => 'assistants.gynecology',
                'ent' => 'assistants.ent',
                'endocrinology' => 'assistants.endocrinology',
                'gastroenterology' => 'assistants.gastroenterology',
                'hematology' => 'assistants.hematology',
                'nephrology' => 'assistants.nephrology',
                'rheumatology' => 'assistants.rheumatology',
                'dental' => 'assistants.dental',
                'nutrition' => 'assistants.nutrition',
                'oncology' => 'assistants.oncology',
                'allergy' => 'assistants.allergy',
                'pulmonology' => 'assistants.pulmonology',
            ];
            
            if (isset($specialistMap[$specialist])) {
                $recommendations[] = $specialistMap[$specialist];
            }
        }
        
        if (!empty($recommendations)) {
            // Önerileri metinden temizle
            $cleanedReply = preg_replace($pattern, '', $reply);
            
            $result = [
                'text' => trim($cleanedReply),
                'specialistRecommendation' => array_unique($recommendations)
            ];
            return json_encode($result, JSON_UNESCAPED_UNICODE);
        }
    }
    
    return $reply;
}
function scheduleUserNotifications($userId) {
    global $conn;
    
    // Kullanıcının chat geçmişini analiz et
    $topics = analyzeUserHealthTopics($userId);
    
    // Mevcut bildirimleri temizle
    $stmt = $conn->prepare("DELETE FROM user_notifications WHERE user_id = ? AND is_sent = 0");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->close();
    
    // Genel sağlık bildirimleri
    $generalNotifications = [
        [
            'type' => 'water',
            'title' => 'Su İçmeyi Unutma! 💧',
            'message' => 'Günde 8 bardak su içmeyi hedefleyin',
            'hour' => 10
        ],
        [
            'type' => 'steps',
            'title' => 'Hareket Zamanı! 🚶',
            'message' => 'Bugün 10.000 adım hedefine ulaşabilir misiniz?',
            'hour' => 15
        ],
        [
            'type' => 'health_tip',
            'title' => 'Sağlık İpucu 💚',
            'message' => 'Düzenli uyku, sağlıklı yaşamın temelidir',
            'hour' => 20
        ]
    ];
    
    // Konuşma geçmişine göre özel bildirimler
    if (in_array('diet', $topics)) {
        $generalNotifications[] = [
            'type' => 'diet',
            'title' => 'Beslenme Hatırlatıcısı 🥗',
            'message' => 'Bugün sebze ve meyve tüketmeyi unutmayın',
            'hour' => 12
        ];
    }
    
    if (in_array('exercise', $topics)) {
        $generalNotifications[] = [
            'type' => 'exercise',
            'title' => 'Egzersiz Zamanı 💪',
            'message' => 'Bugünkü egzersiz rutininizi tamamladınız mı?',
            'hour' => 18
        ];
    }
    
    // Bildirimleri veritabanına kaydet
    foreach ($generalNotifications as $notif) {
        $scheduledTime = new DateTime();
        $scheduledTime->setTime($notif['hour'], 0, 0);
        
        // Eğer zaman geçmişse yarına planla
        if ($scheduledTime < new DateTime()) {
            $scheduledTime->modify('+1 day');
        }
        
        $stmt = $conn->prepare("
            INSERT INTO user_notifications (user_id, type, title, message, scheduled_time) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $timeStr = $scheduledTime->format('Y-m-d H:i:s');
        $stmt->bind_param("issss", $userId, $notif['type'], $notif['title'], $notif['message'], $timeStr);
        $stmt->execute();
        $stmt->close();
    }
}

function analyzeUserHealthTopics($userId) {
    global $conn;
    
    $topics = [];
    
    // Son 7 günün mesajlarını al
    $stmt = $conn->prepare("
        SELECT message 
        FROM user_chats3 
        WHERE user_id = ? 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $keywords = [
        'diet' => ['kilo', 'diyet', 'yemek', 'beslen', 'weight', 'diet', 'food'],
        'exercise' => ['egzersiz', 'spor', 'hareket', 'yürü', 'exercise', 'sport'],
        'sleep' => ['uyku', 'uykusuzluk', 'yorgun', 'sleep', 'tired'],
        'stress' => ['stres', 'endişe', 'kaygı', 'stress', 'anxiety']
    ];
    
    while ($row = $result->fetch_assoc()) {
        $message = strtolower($row['message']);
        foreach ($keywords as $topic => $words) {
            foreach ($words as $word) {
                if (strpos($message, $word) !== false) {
                    $topics[] = $topic;
                    break;
                }
            }
        }
    }
    
    $stmt->close();
    
    return array_unique($topics);
}

/**
 * Locale-duyarlı basit mail başlığı ve metin üretir
 */
function buildResetMail($email, $token, $lang = 'tr'): array {
    $baseUrl = 'https://www.prokoc2.com/reset?token=' . urlencode($token);
    if ($lang === 'en') {
        $subject = 'Password Reset Request';
        $body = "Hello,\n\n"
              . "We received a request to reset your password. "
              . "If you made this request, click the link below within 30 minutes:\n\n"
              . "$baseUrl\n\n"
              . "If you didn't request a reset, please ignore this email.";
    } else { // default TR
        $subject = 'Şifre Sıfırlama Talebi';
        $body = "Merhaba,\n\n"
              . "Hesabınız için bir şifre sıfırlama isteği aldık. "
              . "Eğer bu isteği siz yaptıysanız 30 dakika içinde aşağıdaki bağlantıya tıklayın:\n\n"
              . "$baseUrl\n\n"
              . "Bu işlemi siz yapmadıysanız lütfen e-postayı dikkate almayın.";
    }
    return [$subject, $body];
}

/** 64‐byte random token döndürür */
function generateToken(): string {
    return bin2hex(random_bytes(32)); // 64 karakter
}

// sendMessage action'ına bildirim planlama ekle
function getTurkishSystemPrompt() {
    return <<<EOT
Sen, sağlık ve tıbbi bilgiler konusunda geniş çaplı güncel literatürü değerlendirebilen, aynı zamanda görsel ve laboratuvar verisi analiz yeteneğine sahip gelişmiş bir yapay zekâ asistanısın. 

ÖNEMLI: Eğer bir uzmanlık alanına yönlendirme gerekiyorsa, mutlaka şu formatta belirt:
"[Uzman Önerisi: Kardiyoloji]" veya "[Uzman Önerisi: Dermatoloji]" gibi.

Görevin, kullanıcıya gönderdikleri semptom fotoğraflarını, tahlil sonuçlarını veya yazılı sorularını alarak, en son bilimsel makaleler, klinik rehberler ve tıp dergilerindeki bilimsel çalışmalardan derlediğin bilgileri kullanarak detaylı, açık ve öğretici bir açıklama sunmaktır.

Eğer kullanıcının bahsettiği semptomlar belirli bir uzmanlık alanını işaret ediyorsa, açıklamanın sonunda hangi uzmana gitmesi gerektiğini belirt. Birden fazla uzman önerebilirsin.

Temel kurallar:
1. Tıbbi teşhis koymazsın.
2. Tedavi reçetesi yazmazsın.
3. Kullanıcıya mutlaka "bir sağlık profesyoneline başvurun" uyarısı yaparsın.
4. Verdiğin bilgilerin yalnızca eğitim ve genel bilgilendirme amaçlı olduğunu vurgularsın.
5. Uygun gördüğün uzmanları [Uzman Önerisi: X] formatında belirt.

Her önemli bilgi için kaynak göster:
[1] Mayo Clinic, [2] WHO, [3] PubMed vb.
EOT;
}

function getEnglishSystemPrompt() {
    return <<<EOT
You are an advanced AI assistant capable of evaluating extensive current medical literature and analyzing visual and laboratory data.

IMPORTANT: If referral to a specialist is needed, indicate it in this format:
"[Specialist Recommendation: Cardiology]" or "[Specialist Recommendation: Dermatology]" etc.

Your task is to provide detailed, clear, and educational explanations using the latest scientific articles, clinical guidelines, and medical journal studies.

If the symptoms mentioned by the user indicate a specific specialty area, indicate which specialist they should see at the end of your explanation. You can recommend multiple specialists.

Basic rules:
1. Do not make medical diagnoses.
2. Do not prescribe treatments.
3. Always advise users to "consult a healthcare professional."
4. Emphasize that the information is for educational purposes only.
5. Indicate appropriate specialists in the format [Specialist Recommendation: X].

Cite sources for important information:
[1] Mayo Clinic, [2] WHO, [3] PubMed etc.
EOT;
}

// =============================
//  Nöbetçi Eczane (NosyAPI)
// =============================
class NobetciEczane {
    public static function Find($city) {
        global $debug;
        debugLog("NobetciEczane::Find called with city=$city");

        global $collectApiKey;
        $apiKey = $collectApiKey;
        $url = 'https://www.nosyapi.com/apiv2/service/pharmacies-on-duty';

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $apiKey
        ]);
        $response = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err) {
            debugLog("NosyAPI cURL error: $err");
            return [];
        }

        $json = json_decode($response, true);
        if (!$json || !isset($json["data"])) {
            debugLog("NosyAPI returned invalid data");
            return [];
        }

        $pharmacies = [];
        foreach ($json["data"] as $p) {
            $pharmacies[] = [
                'name'    => $p['pharmacyName'] ?? '-',
                'address' => $p['address']       ?? '-',
                'phone'   => $p['phone']         ?? '-',
                'lat'     => $p['latitude']      ?? null,
                'lng'     => $p['longitude']     ?? null,
            ];
        }
        debugLog("NobetciEczane::Find returning " . count($pharmacies) . " items.");

        return $pharmacies;
    }
}

// =============================
//   API Router
// =============================
if (isset($_GET['action'])) {
    $action = $_GET['action'];
    debugLog("API action=$action");

    switch ($action) {
        // Save user health data (onboarding)
case 'saveHealthData':
    debugLog("saveHealthData route");
    $input = json_decode(file_get_contents('php://input'), true);

    if (empty($input['user_id']) || empty($input['health_data'])) {
        handleError("user_id and health_data required.");
    }

    $userId     = (int)$input['user_id'];
    $healthData = $input['health_data'];

    /* ——— 1) Kullanıcı adını güncelle ——— */
    if (!empty($healthData['displayName'])) {
        $q = $conn->prepare("UPDATE users3 SET name = ? WHERE id = ?");
        $q->bind_param("si", $healthData['displayName'], $userId);
        $q->execute();
        $q->close();
    }

    /* ——— 2) user_profile verisi ——— */
    $birthDate = !empty($healthData['birthDate'])
        ? date('Y-m-d', strtotime($healthData['birthDate']))
        : null;

    $gender    = $healthData['gender']    ?? null;

    // JSON-e dönüşecek cevaplar
    $answers = [
        'birthDate'        => $birthDate,
        'gender'           => $gender,
        'importantDiseases'=> $healthData['importantDiseases'] ?? '',
        'medications'      => $healthData['medications'] ?? '',
        'hadSurgery'       => $healthData['hadSurgery'] ?? false,
        'surgeryDetails'   => $healthData['surgeryDetails'] ?? '',
        'height'           => $healthData['height'] ?? '',
        'weight'           => $healthData['weight'] ?? '',
        'bloodType'        => $healthData['bloodType'] ?? '',
        'allergies'        => $healthData['allergies'] ?? '',
    ];
    $answersJson = json_encode($answers, JSON_UNESCAPED_UNICODE);

    /* Tek sorgu: INSERT varsa UPDATE */
    $stmt = $conn->prepare("
        INSERT INTO user_profile (user_id, gender, birth_date, answers)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            gender      = VALUES(gender),
            birth_date  = VALUES(birth_date),
            answers     = VALUES(answers)
    ");
    $stmt->bind_param("isss", $userId, $gender, $birthDate, $answersJson);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Health data saved", "debug" => $debug]);
    } else {
        echo json_encode(["error" => "Failed: ".$stmt->error, "debug" => $debug]);
    }
    $stmt->close();
    exit;

        // Upload profile photo
        case 'uploadProfilePhoto':
            debugLog("uploadProfilePhoto route");

            if (!isset($_FILES['photo']) || !isset($_POST['user_id'])) {
                handleError("Photo or user_id missing.");
            }
            $language = isset($input['language']) ? $input['language'] : 'tr';
            $userId = (int)$_POST['user_id'];
            $uploadDir = __DIR__ . '/uploads/profile_pics/';
            $uploadUrl = 'https://www.prokoc2.com/uploads/profile_pics/';

            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            $file = $_FILES['photo'];
            $fileName = uniqid() . '-' . basename($file['name']);
            $filePath = $uploadDir . $fileName;

            if (move_uploaded_file($file['tmp_name'], $filePath)) {
                $stmt = $conn->prepare("
                    UPDATE user_profile SET profile_photo = ? WHERE user_id = ?
                ");
                $photoUrl = $uploadUrl . $fileName;
                $stmt->bind_param("si", $photoUrl, $userId);
                if ($stmt->execute()) {
                    echo json_encode(["success" => true, "url" => $photoUrl, "message" => "Photo uploaded", "debug" => $debug]);
                } else {
                    echo json_encode(["error" => "Photo uploaded but not saved to database", "debug" => $debug]);
                }
                $stmt->close();
            } else {
                echo json_encode(["error" => "Failed to upload photo", "debug" => $debug]);
            }
            exit;

        // Delete account
        case 'deleteAccount':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!isset($input['user_id'])) {
                handleError("user_id parameter is required");
            }
            $userId = intval($input['user_id']);
        $language = isset($input['language']) ? $input['language'] : 'tr';
            $stmt = $conn->prepare("DELETE FROM users3 WHERE id = ?");
            if (!$stmt) {
                handleError("SQL Prepare Error: " . $conn->error);
            }
            $stmt->bind_param("i", $userId);
            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Account deleted"]);
            } else {
                echo json_encode(["error" => "Failed to delete account: " . $stmt->error]);
            }
            $stmt->close();
            exit;
// api2.php'de switch içine ekleyin:

case 'getMedications':
    $userId = $_GET['user_id'];
    $stmt = $conn->prepare("
        SELECT * FROM user_medications 
        WHERE user_id = ? 
        ORDER BY created_at DESC
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $medications = [];
    while ($row = $result->fetch_assoc()) {
        $medications[] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'dosage' => $row['dosage'],
            'frequency' => $row['frequency'],
            'times' => json_decode($row['times']),
            'start_date' => $row['start_date'],
            'end_date' => $row['end_date'],
            'notes' => $row['notes'],
            'is_active' => $row['is_active'],
            'color' => $row['color'],
            'icon' => $row['icon']
        ];
    }
    
    echo json_encode(["success" => true, "medications" => $medications, "debug" => $debug]);
    exit;

case 'saveMedication':
    $input = json_decode(file_get_contents('php://input'), true);
    $userId = $input['user_id'];
    $medication = $input['medication'];
    
    $stmt = $conn->prepare("
        INSERT INTO user_medications 
        (user_id, name, dosage, frequency, times, start_date, end_date, notes, is_active, color, icon)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $times = json_encode($medication['times']);
    $isActive = $medication['is_active'] ? 1 : 0;
    $types = "issssssisss";
    $stmt->bind_param($types,
        $userId,
        $medication['name'],
        $medication['dosage'],
        $medication['frequency'],
        $times,
        $medication['start_date'],
        $medication['end_date'],
        $medication['notes'],
        $isActive,
        $medication['color'],
        $medication['icon']
    );
    
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "medication_id" => $stmt->insert_id, "debug" => $debug]);
    } else {
        echo json_encode(["error" => "Failed to save medication: " . $stmt->error, "debug" => $debug]);
    }
    $stmt->close();
    exit;

case 'updateMedication':
    $input = json_decode(file_get_contents('php://input'), true);
    $medicationId = $input['medication_id'];
    $updates = $input['updates'];
    
    $stmt = $conn->prepare("
        UPDATE user_medications 
        SET is_active = ? 
        WHERE id = ?
    ");
    
    $isActive = $updates['is_active'] ? 1 : 0;
    $stmt->bind_param("ii", $isActive, $medicationId);
    
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "debug" => $debug]);
    } else {
        echo json_encode(["error" => "Failed to update medication", "debug" => $debug]);
    }
    $stmt->close();
    exit;

case 'deleteMedication':
    $input = json_decode(file_get_contents('php://input'), true);
    $medicationId = $input['medication_id'];
    
    $stmt = $conn->prepare("DELETE FROM user_medications WHERE id = ?");
    $stmt->bind_param("i", $medicationId);
    
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "debug" => $debug]);
    } else {
        echo json_encode(["error" => "Failed to delete medication", "debug" => $debug]);
    }
    $stmt->close();
    exit;

case 'recordMedicationTaken':
    $input = json_decode(file_get_contents('php://input'), true);
    $userId = $input['user_id'];
    $medicationId = $input['medication_id'];
    $takenTime = $input['taken_time'];
    $takenDate = $input['taken_date'];
    
    $stmt = $conn->prepare("
        INSERT INTO medication_history 
        (user_id, medication_id, taken_date, taken_time, status)
        VALUES (?, ?, ?, ?, 'taken')
    ");
    
    $stmt->bind_param("iiss", $userId, $medicationId, $takenDate, $takenTime);
    
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "debug" => $debug]);
    } else {
        echo json_encode(["error" => "Failed to record medication taken", "debug" => $debug]);
    }
    $stmt->close();
    exit;

case 'getMedicationHistory':
    $userId = $_GET['user_id'];
    $days = isset($_GET['days']) ? intval($_GET['days']) : 7;
    
    $stmt = $conn->prepare("
        SELECT mh.*, um.name, um.dosage 
        FROM medication_history mh
        JOIN user_medications um ON mh.medication_id = um.id
        WHERE mh.user_id = ? 
        AND mh.taken_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        ORDER BY mh.taken_date DESC, mh.taken_time DESC
    ");
    
    $stmt->bind_param("ii", $userId, $days);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $history = [];
    while ($row = $result->fetch_assoc()) {
        $history[] = $row;
    }
    
    echo json_encode(["success" => true, "history" => $history, "debug" => $debug]);
    exit;
        // Save profile
        case 'saveProfile':
            debugLog("saveProfile route");

            $input = json_decode(file_get_contents('php://input'), true);
            if (!isset($input['user_id'])) {
                handleError("user_id missing.");
            }
            $userId = (int)$input['user_id'];
            $profilePhoto = isset($input['profile_photo']) ? trim($input['profile_photo']) : '';
            $answers = isset($input['answers']) ? $input['answers'] : [];
            $language = isset($input['language']) ? $input['language'] : 'tr';

            $answersJson = json_encode($answers, JSON_UNESCAPED_UNICODE);

            $stmt = $conn->prepare("
                INSERT INTO user_profile (user_id, profile_photo, answers, language)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                  profile_photo = VALUES(profile_photo),
                  answers = VALUES(answers),
                  language = VALUES(language)
            ");
            $stmt->bind_param("isss", $userId, $profilePhoto, $answersJson, $language);
            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Profile saved", "debug" => $debug]);
            } else {
                echo json_encode(["error" => "Error saving profile: " . $stmt->error, "debug" => $debug]);
            }
            $stmt->close();
            exit;

        // Signup
        case 'signup':
            debugLog("signup route");
            $input = json_decode(file_get_contents('php://input'), true);
            if (!isset($input['email'], $input['password'])) {
                handleError("Email and password required.");
            }
            $email = trim($input['email']);
            $password = trim($input['password']);
            $name = isset($input['name']) ? trim($input['name']) : '';
$language = isset($input['language']) ? $input['language'] : 'tr';
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                handleError("Invalid email format.");
            }

            $stmt = $conn->prepare("SELECT id FROM users3 WHERE email = ?");
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $stmt->store_result();
            if ($stmt->num_rows > 0) {
                echo json_encode(["error" => "User already exists.", "debug" => $debug]);
                $stmt->close();
                exit;
            }
            $stmt->close();

            $hashed = hashPassword($password);
            $stmt = $conn->prepare(
            "INSERT INTO users3 (name,email,password,provider) VALUES (?,?,?,'email')"
            );
            $stmt->bind_param("sss", $name, $email, $hashed);
            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Registration successful", "debug" => $debug]);
            } else {
                echo json_encode(["error" => "Registration failed: " . $stmt->error, "debug" => $debug]);
            }
            $stmt->close();
            exit;
            // API'ye yeni action ekle
            case 'getScheduledNotifications':
                $userId = $_GET['user_id'];
                
                $stmt = $conn->prepare("
                    SELECT * FROM user_notifications 
                    WHERE user_id = ? 
                    AND is_sent = 0 
                    AND scheduled_time > NOW()
                    ORDER BY scheduled_time ASC
                ");
                $stmt->bind_param("i", $userId);
                $stmt->execute();
                $result = $stmt->get_result();
                
                $notifications = [];
                while ($row = $result->fetch_assoc()) {
                    $notifications[] = $row;
                }
                
                echo json_encode([
                    "success" => true,
                    "notifications" => $notifications,
                    "debug" => $debug
                ]);
                exit;
        // Login with social providers
        case 'loginSocial':
            debugLog("loginSocial route");

            $input = json_decode(file_get_contents('php://input'), true);
            $provider = isset($input['provider']) ? trim($input['provider']) : '';
            $token    = isset($input['token']) ? trim($input['token']) : '';
            $name     = isset($input['name']) ? trim($input['name'])  : '';
            $email    = isset($input['email']) ? trim($input['email']) : '';
            $language = isset($input['language']) ? $input['language'] : 'tr';
            if (!$provider || !$token) {
                handleError("provider and token required.");
            }

            try {
                if ($provider === 'google') {
                    $verifyUrl = "https://oauth2.googleapis.com/tokeninfo?id_token={$token}";
                    $verifyResponse = file_get_contents($verifyUrl);
                    if (!$verifyResponse) {
                        handleError("Google token verification failed.");
                    }
                    $json = json_decode($verifyResponse, true);
                    if (isset($json['error_description'])) {
                        handleError("Google token error: " . $json['error_description']);
                    }

                    $verifiedEmail = $json['email'] ?? '';
                    $verifiedSub   = $json['sub']   ?? '';

                    if (!$verifiedEmail || !$verifiedSub) {
                        handleError("Invalid Google token.");
                    }

                    if (!$name) {
                        $name = "User";
                    }

                    $socialSub = $verifiedSub;
                    $socialEmail = $verifiedEmail;

                } else if ($provider === 'apple') {
                    $appleSub = $input['user_id'] ?? $input['sub'] ?? '';
                    if (!$appleSub) handleError("Apple user_id required.");

                    $socialSub = $appleSub;
                    $socialEmail = $email ?: $socialSub.'@privaterelay.appleid.com';
                    if (!$name) {
                        $name = "Apple User";
                    }

                } else {
                    handleError("Unsupported provider: $provider");
                }

                // Check if user exists
                $stmt = $conn->prepare("SELECT id, name, email FROM users3 WHERE provider = ? AND social_sub = ? LIMIT 1");
                $stmt->bind_param("ss", $provider, $socialSub);
                $stmt->execute();
                $result = $stmt->get_result();

                if ($result->num_rows > 0) {
                    $user = $result->fetch_assoc();
                    $stmt->close();

                    $response = [
                        "success" => true,
                        "message" => "Social login successful",
                        "user_id" => $user['id'],
                        "name"    => $user['name'],
                        "debug"   => $debug,
                    ];
                    echo json_encode($response);
                    exit;
                } else {
                    $stmt->close();

                    // Create new user
                    $randomPass = hashPassword(uniqid());
                    $stmtInsert = $conn->prepare("INSERT INTO users3 (name, email, password, provider, social_sub) VALUES (?, ?, ?, ?, ?)");
                    $stmtInsert->bind_param("sssss", $name, $socialEmail, $randomPass, $provider, $socialSub);
                    if ($stmtInsert->execute()) {
                        $newUserId = $stmtInsert->insert_id;
                        $stmtInsert->close();

                        $response = [
                            "success" => true,
                            "message" => "Social signup successful",
                            "user_id" => $newUserId,
                            "name"    => $name,
                            "debug"   => $debug,
                        ];
                        echo json_encode($response);
                        exit;
                    } else {
                        handleError("Failed to create user: " . $stmtInsert->error);
                    }
                }
            } catch (Exception $e) {
                handleError("loginSocial error: " . $e->getMessage());
            }

            case 'guestLogin':
    debugLog("guestLogin route");
    $input = json_decode(file_get_contents('php://input'), true);
    
    $guestId = $input['guest_id'] ?? 'guest_' . time() . '_' . rand(1000, 9999);
    $guestName = $input['guest_name'] ?? 'Misafir';
    $language = $input['language'] ?? 'tr';
    
    // Misafir kullanıcıyı veritabanına kaydet
    $email = $guestId . '@guest.local'; // Benzersiz bir email
    $password = password_hash(uniqid(), PASSWORD_BCRYPT); // Rastgele şifre
    
    $stmt = $conn->prepare("INSERT INTO users3 (name, email, password, provider) VALUES (?, ?, ?, 'guest')");
    $stmt->bind_param("sss", $guestName, $email, $password);
    
    if ($stmt->execute()) {
        $userId = $stmt->insert_id;
        echo json_encode([
            "success" => true,
            "message" => "Guest login successful",
            "user_id" => $userId,
            "guest_id" => $guestId,
            "name" => $guestName,
            "debug" => $debug
        ]);
    } else {
        echo json_encode([
            "error" => "Failed to create guest user: " . $stmt->error,
            "debug" => $debug
        ]);
    }
    $stmt->close();
    exit;
// Forgot password – send mail with reset link
case 'forgotPassword':
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    if (empty($input['email'])) handleError("email required");
    $email = trim($input['email']);
    $lang  = $input['language'] ?? 'tr';

    // Kullanıcı var mı?
    $stmt = $conn->prepare("SELECT id FROM users3 WHERE email = ? LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0) handleError("Email not registered");

    // Token üret + DB’ye hash olarak ekle
    $token   = generateToken();
    $tokenHash = hash('sha256', $token);
    $expires = date('Y-m-d H:i:s', strtotime('+30 minutes'));

    // Eski token'ları temizle (isteğe bağlı)
    $del = $conn->prepare("DELETE FROM reset_tokens WHERE email = ? OR expires < NOW()");
    $del->bind_param("s", $email);
    $del->execute();

    $ins = $conn->prepare("INSERT INTO reset_tokens(email, token_hash, expires) VALUES(?,?,?)");
    $ins->bind_param("sss", $email, $tokenHash, $expires);
    $ins->execute();

    // Mail gönder
    [$subject, $body] = buildResetMail($email, $token, $lang);
    $headers = "From: DoktorumAI <no-reply@prokoc2.com>\r\nContent-Type: text/plain; charset=UTF-8";
    if (!mail($email, $subject, $body, $headers)) {
        handleError("Mail failed");
    }

    echo json_encode(["success" => true, "message" => "Email sent"]);
    exit;

    // Reset password – verify token + set new password
case 'resetPassword':
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    if (empty($input['token']) || empty($input['newPassword']))
        handleError("token and newPassword required");

    $token      = $input['token'];
    $tokenHash  = hash('sha256', $token);
    $newPassRaw = $input['newPassword'];

    // Token doğrula
    $stmt = $conn->prepare(
        "SELECT email FROM reset_tokens WHERE token_hash = ? AND expires >= NOW() LIMIT 1"
    );
    $stmt->bind_param("s", $tokenHash);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res->num_rows === 0) handleError("Invalid or expired token");

    $row   = $res->fetch_assoc();
    $email = $row['email'];

    // Kullanıcının şifresini güncelle (bcrypt)
    $hash = password_hash($newPassRaw, PASSWORD_BCRYPT);
    $upd  = $conn->prepare("UPDATE users3 SET password = ? WHERE email = ? LIMIT 1");
    $upd->bind_param("ss", $hash, $email);
    $upd->execute();

    // Token’ı sil
    $del = $conn->prepare("DELETE FROM reset_tokens WHERE token_hash = ?");
    $del->bind_param("s", $tokenHash);
    $del->execute();

    echo json_encode(["success" => true, "message" => "Password updated"]);
    exit;
        // Analyze MRI/X-Ray
        case 'analyzeCekim':
            debugLog("analyzeCekim route invoked");
            $language = isset($input['language']) ? $input['language'] : 'tr';
            $input = json_decode(file_get_contents('php://input'), true);
            if ($input) {
                $userId    = (int)$input['user_id'];
                $specialty = "CekimSonucu";
                $user_image = $input['user_image'];
                $fileName  = trim($input['fileName']);
                $caption   = isset($input['caption']) ? trim($input['caption']) : '[Image Analysis Requested]';
                $language  = isset($input['language']) ? $input['language'] : 'tr';
            } else {
                handleError("JSON input expected.");
            }
            
            debugLog("Parameters received: user_id=$userId, fileName=$fileName, language=$language");
            
            // Save file
            $uploadDir = __DIR__ . '/uploads/gptimages/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            $filePath = $uploadDir . $fileName;
            $decodedImage = base64_decode($user_image);
            if ($decodedImage === false) {
                handleError("Failed to decode image.");
            }
            file_put_contents($filePath, $decodedImage);
            $photoUrl = 'https://www.prokoc2.com/uploads/gptimages/' . $fileName;
            
            // Call OpenAI with image
            $assistantReply = callOpenAI($userId, $specialty, $caption, $language, $user_image);
            
            $imageMessage = json_encode([
                "type" => "image",
                "caption" => $caption,
                "url" => $photoUrl
            ], JSON_UNESCAPED_UNICODE);
            
            // Save messages
            $stmt = $conn->prepare("INSERT INTO user_chats3 (user_id, specialty, role, message) VALUES (?, ?, 'user', ?)");
            $stmt->bind_param("iss", $userId, $specialty, $imageMessage);
            $stmt->execute();
            $stmt->close();
            
            $stmt2 = $conn->prepare("INSERT INTO user_chats3 (user_id, specialty, role, message) VALUES (?, ?, 'assistant', ?)");
            $stmt2->bind_param("iss", $userId, $specialty, $assistantReply);
            $stmt2->execute();
            $stmt2->close();
            
            echo json_encode([
                "success" => true,
                "assistant_reply" => $assistantReply,
                "photoUrl" => $photoUrl,
                "debug" => $debug
            ]);
            exit;

        // Analyze lab test
        case 'analyzeTahlil':
            debugLog("analyzeTahlil route invoked");
            $language = isset($input['language']) ? $input['language'] : 'tr';
            $input = json_decode(file_get_contents('php://input'), true);
            if ($input) {
                $userId    = (int)$input['user_id'];
                $specialty = "Tahlil";
                $user_image = $input['user_image'];
                $fileName  = trim($input['fileName']);
                $caption   = isset($input['caption']) ? trim($input['caption']) : '[Lab Test Analysis]';
                $language  = isset($input['language']) ? $input['language'] : 'tr';
            } else {
                handleError("JSON input expected.");
            }
            
            debugLog("Parameters received: user_id=$userId, fileName=$fileName, language=$language");
            
            // Save file
            $uploadDir = __DIR__ . '/uploads/gptimages/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            $filePath = $uploadDir . $fileName;
            $decodedImage = base64_decode($user_image);
            if ($decodedImage === false) {
                handleError("Failed to decode image.");
            }
            file_put_contents($filePath, $decodedImage);
            $photoUrl = 'https://www.prokoc2.com/uploads/gptimages/' . $fileName;
            
            // Call OpenAI with image
            $assistantReply = callOpenAI($userId, $specialty, $caption, $language, $user_image);
            
            $imageMessage = json_encode([
                "type" => "image",
                "caption" => $caption,
                "url" => $photoUrl
            ], JSON_UNESCAPED_UNICODE);
            
            // Save messages
            $stmt = $conn->prepare("INSERT INTO user_chats3 (user_id, specialty, role, message) VALUES (?, ?, 'user', ?)");
            $stmt->bind_param("iss", $userId, $specialty, $imageMessage);
            $stmt->execute();
            $stmt->close();
            
            $stmt2 = $conn->prepare("INSERT INTO user_chats3 (user_id, specialty, role, message) VALUES (?, ?, 'assistant', ?)");
            $stmt2->bind_param("iss", $userId, $specialty, $assistantReply);
            $stmt2->execute();
            $stmt2->close();
            
            echo json_encode([
                "success" => true,
                "assistant_reply" => $assistantReply,
                "photoUrl" => $photoUrl,
                "debug" => $debug
            ]);
            exit;

        // Login
case 'login':
    debugLog("login route");
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Input validasyonu ekleyin
    if (!$input) {
        handleError("Invalid JSON input");
    }
    
    if (!isset($input['email']) || !isset($input['password'])) {
        handleError("Email and password required");
    }
    
    $email = trim($input['email']);
    $password = trim($input['password']);
    $language = isset($input['language']) ? $input['language'] : 'tr';
    
    // Email formatını kontrol et
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        handleError("Invalid email format");
    }
            $stmt = $conn->prepare("SELECT id, name, password FROM users3 WHERE email = ?");
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $result = $stmt->get_result();
        
            if ($result->num_rows === 0) {
                echo json_encode(["error" => "Invalid email or password.", "debug" => $debug]);
                $stmt->close();
                exit;
            }
        
            $user = $result->fetch_assoc();
            $stmt->close();
        
     if (!verifyPassword($password, $user['password'])) {
        echo json_encode(["error" => "Invalid email or password.", "debug" => $debug]);
        exit;
    }
    
    // Profil durumunu kontrol et
    $profileStmt = $conn->prepare("SELECT answers FROM user_profile WHERE user_id = ?");
    $profileStmt->bind_param("i", $user['id']);
    $profileStmt->execute();
    $profileResult = $profileStmt->get_result();
    $profile = $profileResult->fetch_assoc();
    $profileStmt->close();
    
    $hasCompletedOnboarding = false;
    if ($profile && $profile['answers']) {
        $answers = json_decode($profile['answers'], true);
        // En azından zorunlu alanların dolu olup olmadığını kontrol et
        if (isset($answers['birthDate']) && isset($answers['gender'])) {
            $hasCompletedOnboarding = true;
        }
    }
    
    $response = [
        "success" => true,
        "message" => "Login successful",
        "user_id" => $user['id'],
        "name"    => $user['name'],
        "has_completed_onboarding" => $hasCompletedOnboarding,
        "debug"   => $debug
    ];
    
    echo json_encode($response);
    exit;


    // subscription_info tablosunu kontrol eden yeni action ekle
case 'checkSubscription':
    $userId = $_GET['user_id'];
    
    $stmt = $conn->prepare("
        SELECT * FROM subscription_info 
        WHERE user_id = ? 
        LIMIT 1
    ");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        // Trial süresi kontrolü
        if ($row['plan_type'] === 'trial' && $row['trial_end_date']) {
            if (new DateTime($row['trial_end_date']) < new DateTime()) {
                // Trial bitmiş, free'ye çevir
                $updateStmt = $conn->prepare("
                    UPDATE subscription_info 
                    SET plan_type = 'free' 
                    WHERE user_id = ?
                ");
                $updateStmt->bind_param("i", $userId);
                $updateStmt->execute();
                $row['plan_type'] = 'free';
            }
        }
        
        echo json_encode([
            "success" => true,
            "subscription" => $row,
            "debug" => $debug
        ]);
    } else {
        // Yoksa default free olarak oluştur
        $insertStmt = $conn->prepare("
            INSERT INTO subscription_info (user_id, plan_type) 
            VALUES (?, 'free')
        ");
        $insertStmt->bind_param("i", $userId);
        $insertStmt->execute();
        
        echo json_encode([
            "success" => true,
            "subscription" => [
                "plan_type" => "free",
                "daily_message_count" => 0
            ],
            "debug" => $debug
        ]);
    }
    exit;
    case 'updateSubscription':
    $input = json_decode(file_get_contents('php://input'), true);
    $userId = $input['user_id'];
    $planType = $input['plan_type']; // 'trial' veya 'premium'
    
    if ($planType === 'trial') {
        $trialStart = date('Y-m-d H:i:s');
        $trialEnd = date('Y-m-d H:i:s', strtotime('+7 days'));
        
        $stmt = $conn->prepare("
            INSERT INTO subscription_info 
            (user_id, plan_type, trial_start_date, trial_end_date) 
            VALUES (?, 'trial', ?, ?)
            ON DUPLICATE KEY UPDATE 
            plan_type = 'trial',
            trial_start_date = VALUES(trial_start_date),
            trial_end_date = VALUES(trial_end_date)
        ");
        $stmt->bind_param("iss", $userId, $trialStart, $trialEnd);
    } else if ($planType === 'premium') {
        $premiumStart = date('Y-m-d H:i:s');
        
        $stmt = $conn->prepare("
            INSERT INTO subscription_info 
            (user_id, plan_type, premium_start_date) 
            VALUES (?, 'premium', ?)
            ON DUPLICATE KEY UPDATE 
            plan_type = 'premium',
            premium_start_date = VALUES(premium_start_date)
        ");
        $stmt->bind_param("is", $userId, $premiumStart);
    }
    
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "debug" => $debug]);
    } else {
        echo json_encode(["error" => "Failed to update subscription", "debug" => $debug]);
    }
    exit;
// sendMessage case'ini güncelleyin:
/* ============================================================
 *  SEND MESSAGE
 * ============================================================
 */
case 'sendMessage':
    debugLog('sendMessage route');

    // ---------- 1) JSON INPUT ------------------------------------------------
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input)                          handleError('Invalid JSON input');
    if (!isset($input['user_id'],
               $input['specialty'],
               $input['user_message']))   handleError('user_id, specialty and user_message required.');

    $userId            = intval($input['user_id']);
    $specialty         = trim($input['specialty']);
    $userMessage       = trim($input['user_message']);
    $language          = $input['language']          ?? 'tr';
    $isHealthAssistant = $input['is_health_assistant'] ?? false;

    debugLog("Params: userId=$userId • specialty=$specialty • lang=$language");

    // ---------- 2) FREE PLAN - GÜNLÜK MESAJ LİMİTİ ---------------------------
    $subStmt = $conn->prepare(
        "SELECT plan_type, daily_message_count, last_message_date
         FROM   subscription_info
         WHERE  user_id = ?
         LIMIT  1"
    );
    $subStmt->bind_param("i", $userId);
    $subStmt->execute();
    $subRes = $subStmt->get_result();
    $subscription = $subRes->fetch_assoc();
    $subStmt->close();

    if (!$subscription) {
        // Eğer henüz abonelik satırı yoksa ekle (free plan varsayılan)
        $conn->query("INSERT INTO subscription_info (user_id, plan_type)
                      VALUES ($userId, 'free')");
        $subscription = [
            'plan_type'            => 'free',
            'daily_message_count'  => 0,
            'last_message_date'    => null
        ];
    }

    $today = date('Y-m-d');
    if ($subscription['plan_type'] === 'free') {
        // Aynı gün mü?
        if ($subscription['last_message_date'] !== $today) {
            // Yeni gün → sayaç sıfırla
            $conn->query("
                UPDATE subscription_info
                SET daily_message_count = 0,
                    last_message_date   = '$today'
                WHERE user_id = $userId
            ");
            $subscription['daily_message_count'] = 0;
        }

        // Limit: 3 mesaj / gün
        if ($subscription['daily_message_count'] >= 3) {
            echo json_encode([
                "success"        => false,
                "limit_reached"  => true,
                "error"          => "Daily message limit reached",
                "debug"          => $debug
            ]);
            exit;
        }
    }

    // ---------- 3) USER MESAJINI DB’YE YAZ -----------------------------------
    $stmt = $conn->prepare(
        "INSERT INTO user_chats3 (user_id, specialty, role, message)
         VALUES (?, ?, 'user', ?)"
    );
    if (!$stmt) handleError("DB prepare error (user msg): " . $conn->error);
    $stmt->bind_param("iss", $userId, $specialty, $userMessage);
    if (!$stmt->execute()) handleError("DB insert error (user msg): " . $stmt->error);
    $stmt->close();

    // ---------- 4) OPENAI’Yİ ÇAĞIR -------------------------------------------
    try {
        $assistantReply = callOpenAI($userId, $specialty, $userMessage, $language);
    } catch (Exception $e) {
        handleError("OpenAI error: " . $e->getMessage());
    }

    // ---------- 5) ASSISTANT MESAJINI DB’YE YAZ -------------------------------
    $stmt = $conn->prepare(
        "INSERT INTO user_chats3 (user_id, specialty, role, message)
         VALUES (?, ?, 'assistant', ?)"
    );
    if (!$stmt) handleError("DB prepare error (assistant msg): " . $conn->error);
    $stmt->bind_param("iss", $userId, $specialty, $assistantReply);
    if (!$stmt->execute()) handleError("DB insert error (assistant msg): " . $stmt->error);
    $stmt->close();

    // ---------- 6) FREE PLAN SAYAÇ ARTIR -------------------------------------
    if ($subscription['plan_type'] === 'free') {
        $conn->query("
            UPDATE subscription_info
            SET daily_message_count = daily_message_count + 1,
                last_message_date   = '$today'
            WHERE user_id = $userId
        ");
    }

    // ---------- 7) HEALTH-ASSISTANT İSE → NOTİFİKASYON PLANLA -----------------
    if ($isHealthAssistant) {
        scheduleUserNotifications($userId);
    }

    // ---------- 8) SPECIALIST RECOMMENDATION PARSE ---------------------------
    $responseText = $assistantReply;
    if ($isHealthAssistant) {
        // Eğer JSON formatında öneri geldiyse aynen ilet
        $tryJson = json_decode($assistantReply, true);
        if (json_last_error() === JSON_ERROR_NONE &&
            isset($tryJson['specialistRecommendation'])) {
            $responseText = json_encode($tryJson, JSON_UNESCAPED_UNICODE);
        }
    }

    // ---------- 9) RESPONSE --------------------------------------------------
    echo json_encode([
        "success"          => true,
        "assistant_reply"  => $responseText,
        "debug"            => $debug
    ]);
    break;   //  ← case 'sendMessage'

    
        // Get profile
        case 'getProfile':
            debugLog("getProfile route");
            if (!isset($_GET['user_id'])) {
                handleError("user_id missing.");
            }
            $userId = (int)$_GET['user_id'];
$language = isset($input['language']) ? $input['language'] : 'tr';
            $stmt = $conn->prepare("SELECT profile_photo, answers, language FROM user_profile WHERE user_id = ? LIMIT 1");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            $profile = $result->fetch_assoc();
            $stmt->close();

            if (!$profile) {
                debugLog("No profile found for user_id=$userId");
                $profile = [
                    "profile_photo" => "",
                    "answers"       => [],
                    "language"      => "tr",
                ];
            } else {
                $profile['answers'] = json_decode($profile['answers'], true) ?: [];
            }

            echo json_encode(["success" => true, "profile" => $profile, "debug" => $debug]);
            exit;

        // Send image
        case 'sendImage':
            debugLog("sendImage route invoked");
            $language = isset($input['language']) ? $input['language'] : 'tr';
            $input = json_decode(file_get_contents('php://input'), true);
            if ($input) {
                $userId    = (int)$input['user_id'];
                $specialty = trim($input['specialty']);
                $user_image = $input['user_image'];
                $fileName  = trim($input['fileName']);
                $caption   = isset($input['caption']) ? trim($input['caption']) : '[Image Sent]';
                $language  = isset($input['language']) ? $input['language'] : 'tr';
            } else {
                handleError("JSON input expected.");
            }
            
            debugLog("Parameters received: user_id=$userId, specialty=$specialty, fileName=$fileName");
            
            // Save image
            $uploadDir = __DIR__ . '/uploads/gptimages/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            
            $filePath = $uploadDir . $fileName;
            $decodedImage = base64_decode($user_image);
            if ($decodedImage === false) {
                handleError("Failed to decode image.");
            }
            
            file_put_contents($filePath, $decodedImage);
            $photoUrl = 'https://www.prokoc2.com/uploads/gptimages/' . $fileName;
            
            // Call OpenAI with image
            $analysisPrompt = $language === 'en' 
                ? "Please analyze this image and provide medical insights. Remember this is for educational purposes only."
                : "Bu görseli analiz edip tıbbi görüşler verir misiniz? Bu bilgilerin yalnızca eğitim amaçlı olduğunu unutmayın.";
            
            $analysisPrompt .= "\n\n" . ($language === 'en' ? "User description: " : "Kullanıcı açıklaması: ") . $caption;
            
            $assistantReply = callOpenAI($userId, $specialty, $analysisPrompt, $language, $user_image);
            
            // Build image message
            $imageMessage = json_encode([
                "type" => "image",
                "caption" => $caption,
                "url" => $photoUrl
            ], JSON_UNESCAPED_UNICODE);
            
            // Save messages
            $stmt = $conn->prepare("INSERT INTO user_chats3 (user_id, specialty, role, message) VALUES (?, ?, 'user', ?)");
            $stmt->bind_param("iss", $userId, $specialty, $imageMessage);
            $stmt->execute();
            $stmt->close();
            
            $stmt2 = $conn->prepare("INSERT INTO user_chats3 (user_id, specialty, role, message) VALUES (?, ?, 'assistant', ?)");
            $stmt2->bind_param("iss", $userId, $specialty, $assistantReply);
            $stmt2->execute();
            $stmt2->close();
            
            echo json_encode([
                "success" => true, 
                "assistant_reply" => $assistantReply, 
                "photoUrl" => $photoUrl, 
                "debug" => $debug
            ]);
            exit;

        // Get history
        case 'getHistory':
            debugLog("getHistory route");
            if (!isset($_GET['user_id'])) {
                handleError("user_id missing.");
            }
            $language = isset($input['language']) ? $input['language'] : 'tr';
            $userId = (int)$_GET['user_id'];
            $stmt = $conn->prepare("
                SELECT specialty, role, message, created_at
                FROM user_chats3
                WHERE user_id = ?
                ORDER BY created_at ASC
            ");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            $history = [];
            while ($row = $result->fetch_assoc()) {
                $history[] = $row;
            }
            $stmt->close();
            echo json_encode(["success" => true, "history" => $history, "debug" => $debug]);
            exit;

        // Get history by specialty
        case 'getHistoryBySpecialty':
            debugLog("getHistoryBySpecialty route");
            if (!isset($_GET['user_id'], $_GET['specialty'])) {
                handleError("user_id and specialty missing.");
            }
            $userId = (int)$_GET['user_id'];
            $spec   = trim($_GET['specialty']);
        $language = isset($input['language']) ? $input['language'] : 'tr';
            $stmt = $conn->prepare("
                SELECT id, specialty, role, message, created_at
                FROM user_chats3
                WHERE user_id = ? AND specialty = ?
                ORDER BY created_at ASC
            ");
            $stmt->bind_param("is", $userId, $spec);
            $stmt->execute();
            $result = $stmt->get_result();
            $history = [];
            while ($row = $result->fetch_assoc()) {
                $history[] = $row;
            }
            $stmt->close();
        
            echo json_encode(["success" => true, "history" => $history, "debug" => $debug]);
            exit;

        // Get nearby hospitals
        case 'getNearbyHospitals':
            debugLog("getNearbyHospitals route");
            $lat = isset($_GET['lat']) ? floatval($_GET['lat']) : 0;
            $lng = isset($_GET['lng']) ? floatval($_GET['lng']) : 0;
            $radius = isset($_GET['radius']) ? intval($_GET['radius']) : 10;
            $language = isset($input['language']) ? $input['language'] : 'tr';
            // Mock data for hospitals
            $hospitals = [
                [
                    'name' => 'İstanbul Üniversitesi Tıp Fakültesi',
                    'address' => 'Fatih, İstanbul',
                    'phone' => '+90 212 414 20 00',
                    'distance' => 2.5,
                    'emergency' => true,
                    'lat' => 41.0082,
                    'lng' => 28.9784,
                ],
                [
                    'name' => 'Acıbadem Hastanesi',
                    'address' => 'Kadıköy, İstanbul',
                    'phone' => '+90 216 544 44 44',
                    'distance' => 5.3,
                    'emergency' => true,
                    'lat' => 40.9923,
                    'lng' => 29.0274,
                ],
            ];
            
            echo json_encode(["success" => true, "hospitals" => $hospitals, "debug" => $debug]);
            exit;

        // Record emergency call
        case 'recordEmergencyCall':
            $input = json_decode(file_get_contents('php://input'), true);
            $userId = (int)$input['user_id'];
            $number = $input['number'];
            $location = $input['location'];
            $timestamp = $input['timestamp'];
            $language = isset($input['language']) ? $input['language'] : 'tr';
            // Here you would save to database
            echo json_encode(["success" => true, "message" => "Emergency call recorded", "debug" => $debug]);
            exit;

        // Record SOS
        case 'recordSOS':
            $input = json_decode(file_get_contents('php://input'), true);
            $userId = (int)$input['user_id'];
            $location = $input['location'];
            $contactsNotified = $input['contacts_notified'];
            $timestamp = $input['timestamp'];
            $language = isset($input['language']) ? $input['language'] : 'tr';
            // Here you would save to database and potentially send notifications
            echo json_encode(["success" => true, "message" => "SOS recorded", "debug" => $debug]);
            exit;
// api2.php içinde nobetciEczaneler case'ini güncelleyin:
case 'nobetciEczaneler':
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'authorization: apikey '.$collectApiKey,
    'content-type: application/json'
]);
    debugLog("nobetciEczaneler route");
    $language = isset($input['language']) ? $input['language'] : 'tr';
    $city = isset($_GET['city']) ? trim($_GET['city']) : 'Istanbul';
    debugLog("city param: $city");
    
    try {
        // NosyAPI yerine collectapi kullanımı
        $url = 'https://api.collectapi.com/health/dutyPharmacy?il=' . urlencode($city);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'authorization: apikey ' . $apiKey,
            'content-type: application/json'
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        
        if ($err) {
            debugLog("API cURL error: $err");
            echo json_encode(["error" => "API connection error", "debug" => $debug]);
            exit;
        }
        
        if ($httpCode !== 200) {
            debugLog("API HTTP error: $httpCode");
            echo json_encode(["error" => "API error: HTTP $httpCode", "debug" => $debug]);
            exit;
        }
        
        $json = json_decode($response, true);
        
        if (!$json || !isset($json["result"])) {
            // Örnek veri döndür (test için)
            $mockData = [
                [
                    'name' => 'Merkez Eczanesi',
                    'address' => 'Kadıköy, Bahariye Cad. No:45, İstanbul',
                    'phone' => '0216 123 45 67',
                    'lat' => 40.9876,
                    'lng' => 29.0300
                ],
                [
                    'name' => 'Yıldız Eczanesi',
                    'address' => 'Beşiktaş, Barbaros Bulvarı No:123, İstanbul',
                    'phone' => '0212 234 56 78',
                    'lat' => 41.0456,
                    'lng' => 29.0089
                ],
                [
                    'name' => 'Sağlık Eczanesi',
                    'address' => 'Üsküdar, Çamlıca Cad. No:78, İstanbul',
                    'phone' => '0216 345 67 89',
                    'lat' => 41.0234,
                    'lng' => 29.0567
                ]
            ];
            
            echo json_encode(["success" => true, "data" => $mockData, "debug" => $debug]);
            exit;
        }
        
        $pharmacies = [];
        foreach ($json["result"] as $p) {
            $pharmacies[] = [
                'name'    => $p['name'] ?? '-',
                'address' => $p['address'] ?? '-',
                'phone'   => $p['phone'] ?? '-',
                'lat'     => isset($p['loc']) ? floatval(explode(',', $p['loc'])[0]) : null,
                'lng'     => isset($p['loc']) ? floatval(explode(',', $p['loc'])[1]) : null,
            ];
        }
        
        echo json_encode(["success" => true, "data" => $pharmacies, "debug" => $debug]);
    } catch (Exception $e) {
        echo json_encode(["error" => $e->getMessage(), "debug" => $debug]);
    }
    exit;

        default:
            handleError("Invalid action.");
    }
} else {
    handleError("Action not specified.");
}

$conn->close();
exit;