// worker.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Webhook تلگرام
    if (url.pathname === '/webhook' && request.method === 'POST') {
      try {
        const body = await request.json();
        
        // فقط پیام‌های متنی
        if (body.message && body.message.text) {
          const chatId = body.message.chat.id;
          const text = body.message.text;
          const messageId = body.message.message_id;
          const date = new Date(body.message.date * 1000);
          
          // ساخت HTML
          const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${text.substring(0, 50)}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            max-width: 800px; 
            margin: 20px auto; 
            padding: 20px; 
            line-height: 1.8; 
            background: #f5f5f5; 
            direction: rtl;
        }
        .post { 
            background: white; 
            padding: 30px; 
            border-radius: 12px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }
        .date { 
            color: #888; 
            font-size: 14px; 
            border-bottom: 2px solid #eee; 
            padding-bottom: 15px; 
            margin-bottom: 20px;
        }
        .content { 
            margin-top: 20px; 
            white-space: pre-wrap; 
            word-wrap: break-word;
        }
        .footer { 
            margin-top: 30px; 
            color: #aaa; 
            font-size: 12px; 
            text-align: center; 
            border-top: 1px solid #eee; 
            padding-top: 20px; 
        }
    </style>
</head>
<body>
    <div class="post">
        <div class="date">📅 ${date.toLocaleDateString('fa-IR')} - ${date.toLocaleTimeString('fa-IR')}</div>
        <div class="content">${text}</div>
        <div class="footer">منتشر شده از طریق ربات تلگرام</div>
    </div>
</body>
</html>`;
          
          // نام فایل با تاریخ و ID
          const fileName = `post-${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}-${messageId}.html`;
          
          // آپلود به GitHub
          const githubResponse = await fetch(
            `https://api.github.com/repos/${env.GITHUB_USERNAME}/${env.GITHUB_REPO}/contents/${fileName}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'TelegramBot-Cloudflare'
              },
              body: JSON.stringify({
                message: `Add post ${messageId} - ${date.toISOString()}`,
                content: btoa(unescape(encodeURIComponent(htmlContent))),
                branch: env.GITHUB_BRANCH || 'main'
              })
            }
          );
          
          if (!githubResponse.ok) {
            const errorData = await githubResponse.text();
            console.error('GitHub Error:', errorData);
            throw new Error(`GitHub API Error: ${githubResponse.status} - ${errorData}`);
          }
          
          const result = await githubResponse.json();
          const pageUrl = `https://${env.GITHUB_USERNAME}.github.io/${env.GITHUB_REPO}/${fileName}`;
          
          // ارسال تایید به تلگرام
          await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `✅ صفحه با موفقیت منتشر شد!\n\n🔗 لینک: ${pageUrl}`,
              disable_web_page_preview: true
            })
          });
        }
        
        return new Response('OK', { status: 200 });
      } catch (error) {
        console.error('Error:', error);
        return new Response(`Error: ${error.message}`, { status: 500 });
      }
    }
    
    // صفحه اصلی Worker
    if (url.pathname === '/') {
      return new Response('🤖 ربات تلگرام به گیت‌هاب در حال اجرا است', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
    
    // Health check
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }
    
    return new Response('Not Found', { status: 404 });
  }
};
