# API Integration Examples

## 1. Authentication Setup

### OAuth 2.0 Flow

```bash
# 1. Başlangıçta (browser'da)
GET https://your-domain.com/api/auth/signin

# 2. Redirects to Google OAuth:
GET https://accounts.google.com/o/oauth2/v2/auth?
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://your-domain.com/api/auth/google/callback&
  response_type=code&
  scope=openid%20profile%20email%20https://www.googleapis.com/auth/gmail.readonly

# 3. Backend alır code'u ve token'ı:
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTH_CODE&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET&
redirect_uri=https://your-domain.com/api/auth/google/callback

# Response:
{
  "access_token": "ya29.a0AfH6SMBx...",
  "expires_in": 3599,
  "refresh_token": "1//0gW...",
  "scope": "openid profile email https://www.googleapis.com/auth/gmail.readonly",
  "token_type": "Bearer"
}

# 4. Bearer token'ı kullan API calls'ta
Authorization: Bearer ya29.a0AfH6SMBx...
```

## 2. Message Processing API

### Example 1: cURL

```bash
# Basic message
curl -X POST https://your-domain.com/api/ai/process-message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "E-postalarımı özet yap",
    "context": "email",
    "engine": "auto"
  }'

# Response:
{
  "id": "msg_1234567890",
  "response": "Son 24 saatte 15 yeni e-posta aldınız...",
  "engine": "gemini",
  "timestamp": "2025-11-01T10:30:00Z",
  "metadata": {
    "tokensUsed": 1250,
    "processingTime": 2.3,
    "confidence": 0.95
  }
}

# Specific engine seçimi
curl -X POST https://your-domain.com/api/ai/process-message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Bu konuyu detaylı analiz et",
    "context": "research",
    "engine": "claude"
  }'

# Streaming response (Server-Sent Events)
curl -X POST https://your-domain.com/api/ai/stream \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Uzun bir metin oluştur",
    "context": "creative",
    "engine": "gpt-4"
  }' \
  --no-buffer
```

### Example 2: Python

```python
import requests
import json
from typing import Generator

class AIClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.token = token
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def process_message(
        self,
        message: str,
        context: str = "general",
        engine: str = "auto"
    ) -> dict:
        """Process a message and get AI response"""
        
        payload = {
            "message": message,
            "context": context,
            "engine": engine
        }
        
        response = requests.post(
            f"{self.base_url}/api/ai/process-message",
            headers=self.headers,
            json=payload
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"API Error: {response.status_code} - {response.text}")
    
    def stream_message(
        self,
        message: str,
        context: str = "general",
        engine: str = "auto"
    ) -> Generator[str, None, None]:
        """Stream response from AI"""
        
        payload = {
            "message": message,
            "context": context,
            "engine": engine
        }
        
        response = requests.post(
            f"{self.base_url}/api/ai/stream",
            headers=self.headers,
            json=payload,
            stream=True
        )
        
        for line in response.iter_lines():
            if line:
                data = json.loads(line)
                if data.get("type") == "chunk":
                    yield data.get("content", "")

# Kullanım
client = AIClient(
    base_url="https://your-domain.com",
    token="YOUR_JWT_TOKEN"
)

# Normal request
result = client.process_message(
    message="Python'da REST API nasıl yapılır?",
    context="research",
    engine="claude"
)
print(result["response"])

# Streaming
print("Streaming response:")
for chunk in client.stream_message(
    message="Türkiye'nin tarihi hakkında uzun bir deneme yazı yazarak",
    context="creative"
):
    print(chunk, end="", flush=True)
print()
```

### Example 3: JavaScript/TypeScript

```typescript
interface AIResponse {
  id: string
  response: string
  engine: string
  timestamp: string
  metadata: {
    tokensUsed: number
    processingTime: number
    confidence: number
  }
}

class AIClient {
  constructor(
    private baseUrl: string,
    private token: string
  ) {}

  async processMessage(
    message: string,
    context: string = "general",
    engine: "auto" | "openai" | "gemini" | "claude" = "auto"
  ): Promise<AIResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/ai/process-message`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          context,
          engine
        })
      }
    )

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    return response.json()
  }

  async *streamMessage(
    message: string,
    context: string = "general",
    engine: "auto" | "openai" | "gemini" | "claude" = "auto"
  ): AsyncGenerator<string> {
    const response = await fetch(
      `${this.baseUrl}/api/ai/stream`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          context,
          engine
        })
      }
    )

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) return

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value)
      const lines = text.split("\n")

      for (const line of lines) {
        if (line.trim()) {
          const data = JSON.parse(line)
          if (data.type === "chunk") {
            yield data.content || ""
          }
        }
      }
    }
  }
}

// Kullanım (React)
import { useState } from "react"

export function ChatComponent() {
  const [response, setResponse] = useState("")
  const client = new AIClient("https://your-domain.com", "YOUR_JWT_TOKEN")

  const handleProcessMessage = async (message: string) => {
    try {
      const result = await client.processMessage(message, "general", "auto")
      setResponse(result.response)
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const handleStreamMessage = async (message: string) => {
    setResponse("")
    try {
      for await (const chunk of client.streamMessage(message)) {
        setResponse(prev => prev + chunk)
      }
    } catch (error) {
      console.error("Error:", error)
    }
  }

  return (
    <div>
      <button onClick={() => handleProcessMessage("Merhaba")}>
        Normal
      </button>
      <button onClick={() => handleStreamMessage("Merhaba")}>
        Streaming
      </button>
      <p>{response}</p>
    </div>
  )
}
```

## 3. Audio Processing API

### Transcribe Audio

```bash
# cURL ile
curl -X POST https://your-domain.com/api/audio/transcribe \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "audio=@/path/to/audio.mp3" \
  -F "language=tr"

# Response:
{
  "text": "Transkribe edilmiş metin",
  "language": "tr",
  "confidence": 0.98,
  "duration": 5.2
}
```

### Python

```python
import requests

def transcribe_audio(
    audio_path: str,
    language: str = "tr",
    token: str = "YOUR_JWT_TOKEN"
) -> dict:
    """Transcribe audio file to text"""
    
    with open(audio_path, 'rb') as f:
        files = {
            'audio': f,
            'language': (None, language)
        }
        
        response = requests.post(
            "https://your-domain.com/api/audio/transcribe",
            headers={
                "Authorization": f"Bearer {token}"
            },
            files=files
        )
    
    return response.json()

# Kullanım
result = transcribe_audio("recording.mp3", "tr")
print(f"Text: {result['text']}")
print(f"Confidence: {result['confidence']}")
```

## 4. Gmail Integration API

### List Emails

```bash
# Get last 10 emails
curl -X GET "https://your-domain.com/api/gmail/messages?limit=10&labels=inbox" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response:
{
  "messages": [
    {
      "id": "msg_123",
      "from": "sender@example.com",
      "subject": "Important update",
      "snippet": "This is a preview...",
      "timestamp": "2025-11-01T10:00:00Z",
      "labels": ["inbox", "important"]
    }
  ],
  "nextPageToken": "page_token_123"
}
```

### Sync Emails

```bash
curl -X POST https://your-domain.com/api/gmail/sync \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "since": "2025-10-01T00:00:00Z",
    "labels": ["inbox", "important"],
    "limit": 50
  }'

# Response:
{
  "newMessages": 23,
  "updatedMessages": 5,
  "lastSync": "2025-11-01T10:35:00Z",
  "status": "completed"
}
```

## 5. Google Drive Integration API

### List Files

```bash
curl -X GET "https://your-domain.com/api/drive/list?folderId=root&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response:
{
  "files": [
    {
      "id": "file_123",
      "name": "Project Proposal.docx",
      "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "modifiedTime": "2025-11-01T10:00:00Z",
      "size": 102400,
      "parents": ["root"]
    }
  ]
}
```

## 6. Error Handling Examples

```python
import requests
from requests.exceptions import RequestException
import time

class RobustAIClient:
    def __init__(self, base_url: str, token: str, max_retries: int = 3):
        self.base_url = base_url
        self.token = token
        self.max_retries = max_retries
    
    def _request_with_retry(self, method: str, endpoint: str, **kwargs) -> dict:
        """Execute request with exponential backoff"""
        
        for attempt in range(self.max_retries):
            try:
                response = requests.request(
                    method=method,
                    url=f"{self.base_url}{endpoint}",
                    headers={
                        "Authorization": f"Bearer {self.token}",
                        "Content-Type": "application/json"
                    },
                    timeout=30,
                    **kwargs
                )
                
                # Handle different status codes
                if response.status_code == 429:
                    # Rate limited - retry with backoff
                    wait_time = 2 ** attempt
                    print(f"Rate limited. Waiting {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                
                elif response.status_code == 503:
                    # Service unavailable - retry
                    wait_time = 2 ** attempt
                    print(f"Service unavailable. Waiting {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                
                elif response.status_code == 401:
                    # Unauthorized - don't retry
                    raise Exception("Invalid token")
                
                elif response.status_code >= 400:
                    raise Exception(f"HTTP {response.status_code}: {response.text}")
                
                return response.json()
            
            except RequestException as e:
                if attempt == self.max_retries - 1:
                    raise
                
                wait_time = 2 ** attempt
                print(f"Request failed: {e}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
        
        raise Exception("Max retries exceeded")
    
    def process_message(self, message: str) -> dict:
        """Process message with error handling"""
        try:
            return self._request_with_retry(
                "POST",
                "/api/ai/process-message",
                json={"message": message, "context": "general"}
            )
        except Exception as error:
            print(f"Error processing message: {error}")
            raise
```

## 7. Testing with Postman

### Postman Collection JSON

```json
{
  "info": {
    "name": "AI PC System API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/api/auth/signin",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{}",
              "options": {"raw": {"language": "json"}}
            }
          }
        }
      ]
    },
    {
      "name": "AI Processing",
      "item": [
        {
          "name": "Process Message",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/api/ai/process-message",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\"message\": \"Hello\", \"context\": \"general\", \"engine\": \"auto\"}"
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://your-domain.com"
    },
    {
      "key": "token",
      "value": "your-jwt-token"
    }
  ]
}
```

---

Bu örnekler, sisteminizin API'sini entegre etmek için kullanılabilir. Daha fazla detay için `/api/docs` swagger dokumentasyonunu kontrol edin!
