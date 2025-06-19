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

// Database config
$servername = "localhost";
$username   = "prokocco_pro5User";
$password   = "leBronjames5!";
$dbname     = "prokocco_pro5";

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

// GPT-4 Vision API Key
$OPENAI_API_KEY = "..";

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
    // Look for specialist recommendations in the reply
    $specialists = [
        'tr' => [
            'kardiyoloji' => 'assistants.cardiology',
            'dermatoloji' => 'assistants.dermatology',
            'pediatri' => 'assistants.pediatrics',
            'psikoloji' => 'assistants.psychology',
            'nöroloji' => 'assistants.neurology',
            'ortopedi' => 'assistants.orthopedics',
            'üroloji' => 'assistants.urology',
            'göz' => 'assistants.ophthalmology',
            'kadın doğum' => 'assistants.gynecology',
            'kulak burun boğaz' => 'assistants.ent',
        ],
        'en' => [
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
        ]
    ];
    
    $recommendations = [];
    $specialistList = $specialists[$language] ?? $specialists['en'];
    
    foreach ($specialistList as $keyword => $nameKey) {
        if (stripos($reply, $keyword) !== false) {
            $recommendations[] = $nameKey;
        }
    }
    
    // If recommendations found, add them as JSON
    if (!empty($recommendations)) {
        $result = [
            'text' => $reply,
            'specialistRecommendation' => $recommendations
        ];
        return json_encode($result, JSON_UNESCAPED_UNICODE);
    }
    
    return $reply;
}

function getTurkishSystemPrompt() {
    return <<<EOT
Sen, sağlık ve tıbbi bilgiler konusunda geniş çaplı güncel literatürü değerlendirebilen, aynı zamanda görsel ve laboratuvar verisi analiz yeteneğine sahip gelişmiş bir yapay zekâ asistanısın. 

ÖNEMLI: Eğer bir uzmanlık alanına yönlendirme gerekiyorsa, mutlaka şu formatta belirt:
"[Uzman Önerisi: Kardiyoloji]" veya "[Uzman Önerisi: Dermatoloji]" gibi.

Görevin, kullanıcıya gönderdikleri semptom fotoğraflarını, tahlil sonuçlarını veya yazılı sorularını alarak, en son bilimsel makaleler, klinik rehberler ve tıp dergilerindeki bilimsel çalışmalardan derlediğin bilgileri kullanarak detaylı, açık ve öğretici bir açıklama sunmaktır.

Temel kurallar:
1. Tıbbi teşhis koymazsın.
2. Tedavi reçetesi yazmazsın.
3. Kullanıcıya mutlaka "bir sağlık profesyoneline başvurun" uyarısı yaparsın.
4. Verdiğin bilgilerin yalnızca eğitim ve genel bilgilendirme amaçlı olduğunu vurgularsın.

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

Basic rules:
1. Do not make medical diagnoses.
2. Do not prescribe treatments.
3. Always advise users to "consult a healthcare professional."
4. Emphasize that the information is for educational purposes only.

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

        $apiKey = '..';
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
            if (!isset($input['user_id'], $input['health_data'])) {
                handleError("user_id and health_data required.");
            }
            
            $userId = (int)$input['user_id'];
            $healthData = $input['health_data'];
            
            // Convert health data to answers format for existing profile structure
            $answers = [
                'birthDate' => $healthData['birthDate'] ?? '',
                'gender' => $healthData['gender'] ?? '',
                'importantDiseases' => $healthData['importantDiseases'] ?? '',
                'medications' => $healthData['medications'] ?? '',
                'hadSurgery' => $healthData['hadSurgery'] ?? false,
                'surgeryDetails' => $healthData['surgeryDetails'] ?? '',
                'height' => $healthData['height'] ?? '',
                'weight' => $healthData['weight'] ?? '',
                'bloodType' => $healthData['bloodType'] ?? '',
                'allergies' => $healthData['allergies'] ?? '',
            ];
            
            $answersJson = json_encode($answers, JSON_UNESCAPED_UNICODE);
            
            $stmt = $conn->prepare("
                INSERT INTO user_profile (user_id, answers)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE answers = VALUES(answers)
            ");
            $stmt->bind_param("is", $userId, $answersJson);
            
            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Health data saved", "debug" => $debug]);
            } else {
                echo json_encode(["error" => "Failed to save health data: " . $stmt->error, "debug" => $debug]);
            }
            $stmt->close();
            exit;

        // Upload profile photo
        case 'uploadProfilePhoto':
            debugLog("uploadProfilePhoto route");

            if (!isset($_FILES['photo']) || !isset($_POST['user_id'])) {
                handleError("Photo or user_id missing.");
            }

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
            $stmt = $conn->prepare("INSERT INTO users3 (name, email, password) VALUES (?, ?, ?)");
            $stmt->bind_param("sss", $name, $email, $hashed);
            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Registration successful", "debug" => $debug]);
            } else {
                echo json_encode(["error" => "Registration failed: " . $stmt->error, "debug" => $debug]);
            }
            $stmt->close();
            exit;

        // Login with social providers
        case 'loginSocial':
            debugLog("loginSocial route");

            $input = json_decode(file_get_contents('php://input'), true);
            $provider = isset($input['provider']) ? trim($input['provider']) : '';
            $token    = isset($input['token']) ? trim($input['token']) : '';
            $name     = isset($input['name']) ? trim($input['name'])  : '';
            $email    = isset($input['email']) ? trim($input['email']) : '';

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
                    $appleSub = isset($input['user_id']) ? trim($input['user_id']) : '';
                    
                    if (!$appleSub) {
                        handleError("Apple user_id required.");
                    }

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

        // Forgot password
        case 'forgotPassword':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!isset($input['email'])) handleError("email required");
            $email = trim($input['email']);

            $stmt = $conn->prepare("SELECT id FROM users3 WHERE email = ? LIMIT 1");
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $res = $stmt->get_result();
            if ($res->num_rows === 0) handleError("Email not registered");

            $token = bin2hex(random_bytes(16));
            $expires = date('Y-m-d H:i:s', strtotime('+30 minutes'));

            $conn->query("CREATE TABLE IF NOT EXISTS reset_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255),
                token VARCHAR(64),
                expires DATETIME)");

            $ins = $conn->prepare("INSERT INTO reset_tokens(email, token, expires) VALUES(?,?,?)");
            $ins->bind_param("sss", $email, $token, $expires);
            $ins->execute();
            $ins->close();

            mail($email, "Password Reset", "Click within 30 minutes:\nhttps://www.prokoc2.com/reset?token=$token");

            echo json_encode(["success"=>true, "message"=>"Email sent"]);
            exit;

        // Analyze MRI/X-Ray
        case 'analyzeCekim':
            debugLog("analyzeCekim route invoked");
            
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
            if (!isset($input['email'], $input['password'])) {
                handleError("Email and password required.");
            }
            $email = trim($input['email']);
            $password = trim($input['password']);
        
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
        
            $response = [
                "success" => true,
                "message" => "Login successful",
                "user_id" => $user['id'],
                "name"    => $user['name'],
                "debug"   => $debug
            ];
            
            echo json_encode($response);
            exit;

        // Send message
        case 'sendMessage':
            debugLog("sendMessage route");
            $input = json_decode(file_get_contents('php://input'), true);
            if (!isset($input['user_id'], $input['specialty'], $input['user_message'])) {
                handleError("user_id, specialty and user_message required.");
            }
            $userId = (int)$input['user_id'];
            $specialty = trim($input['specialty']);
            $userMessage = trim($input['user_message']);
            $language = isset($input['language']) ? $input['language'] : 'tr';
            $isHealthAssistant = isset($input['is_health_assistant']) ? $input['is_health_assistant'] : false;

            // Insert user message
            $stmt = $conn->prepare("
                INSERT INTO user_chats3 (user_id, specialty, role, message) 
                VALUES (?, ?, 'user', ?)
            ");
            $stmt->bind_param("iss", $userId, $specialty, $userMessage);
            $stmt->execute();
            $stmt->close();

            // Call OpenAI
            $assistantReply = callOpenAI($userId, $specialty, $userMessage, $language);

            // Insert assistant reply
            $stmt2 = $conn->prepare("
                INSERT INTO user_chats3 (user_id, specialty, role, message) 
                VALUES (?, ?, 'assistant', ?)
            ");
            $stmt2->bind_param("iss", $userId, $specialty, $assistantReply);
            $stmt2->execute();
            $stmt2->close();

            echo json_encode([
                "success" => true,
                "assistant_reply" => $assistantReply,
                "debug" => $debug
            ]);
            exit;

        // Get profile
        case 'getProfile':
            debugLog("getProfile route");
            if (!isset($_GET['user_id'])) {
                handleError("user_id missing.");
            }
            $userId = (int)$_GET['user_id'];

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
            
            // Here you would save to database and potentially send notifications
            echo json_encode(["success" => true, "message" => "SOS recorded", "debug" => $debug]);
            exit;

        // Duty pharmacies
        case 'nobetciEczaneler':
            debugLog("nobetciEczaneler route");
            $city = isset($_GET['city']) ? trim($_GET['city']) : '';
            debugLog("city param: $city");
            try {
                $eczaneler = NobetciEczane::Find($city);
                echo json_encode(["success" => true, "data" => $eczaneler, "debug" => $debug]);
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