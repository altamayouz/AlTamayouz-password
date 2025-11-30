const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// التحقق من وجود متغيرات البيئة الأساسية
const requiredEnvVars = ['EMAIL_USER', 'EMAIL_PASS', 'ADMIN_PASSWORD'];
requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
        console.warn(`⚠️  تحذير: متغير البيئة ${envVar} غير موجود`);
    }
});

// كلمة السر الصحيحة الحالية
let CORRECT_PASSWORD = process.env.INITIAL_PASSWORD || "Abc1234";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// إعدادات البريد الإلكتروني
const emailConfig = {
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
};

// دالة للتحقق من صحة كلمة السر
function isValidPassword(password) {
    const regex = /^[A-Za-z]{7}$/;
    return regex.test(password);
}

// دالة لتوليد كلمة سر جديدة
function generateNewPassword() {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    let newPassword = '';
    
    newPassword += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    newPassword += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    
    const allChars = uppercase + lowercase;
    for (let i = 2; i < 7; i++) {
        newPassword += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    return newPassword.split('').sort(() => 0.5 - Math.random()).join('');
}

// دالة لإرسال البريد الإلكتروني
async function sendEmail(newPassword, action = 'تغيير تلقائي') {
    try {
        const transporter = nodemailer.createTransporter(emailConfig);
        
        const mailOptions = {
            from: `"نظام كلمات السر" <${emailConfig.auth.user}>`,
            to: 'yousefkp2010@gmail.com',
            subject: 'كلمة السر الجديدة - النظام',
            text: `كلمة السر الجديدة هي: ${newPassword}\nالإجراء: ${action}`,
            html: `
                <div dir="rtl" style="font-family: Arial, sans-serif;">
                    <h2 style="color: #2c3e50;">كلمة السر الجديدة</h2>
                    <p>كلمة السر الجديدة للنظام هي: <strong style="color: #e74c3c; font-size: 18px;">${newPassword}</strong></p>
                    <p><strong>الإجراء:</strong> ${action}</p>
                    <p><strong>الوقت:</strong> ${new Date().toLocaleString('ar-EG')}</p>
                    <hr style="margin: 20px 0;">
                    <p style="color: #7f8c8d; font-size: 12px;">هذه رسالة تلقائية من نظام إدارة كلمات السر</p>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`✅ تم إرسال البريد الإلكتروني بنجاح - ${action}`);
        return true;
    } catch (error) {
        console.error('❌ خطأ في إرسال البريد:', error.message);
        return false;
    }
}

// نقطة النهاية للتحقق من كلمة السر
app.post('/verify-password', async (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({
                success: false,
                error: 'كلمة السر مطلوبة'
            });
        }
        
        if (password.length !== 7) {
            return res.status(400).json({
                success: false,
                error: 'طول كلمة السر يجب أن يكون 7 أحرف'
            });
        }
        
        if (password === CORRECT_PASSWORD) {
            const newPassword = generateNewPassword();
            const oldPassword = CORRECT_PASSWORD;
            CORRECT_PASSWORD = newPassword;
            
            const emailSent = await sendEmail(newPassword, 'تغيير تلقائي بعد التحقق الناجح');
            
            console.log(`✅ تحقق ناجح - تم تغيير كلمة السر من ${oldPassword} إلى ${newPassword}`);
            
            return res.json({
                success: true,
                message: 'تم التحقق بنجاح وإرسال كلمة السر الجديدة إلى بريدك الإلكتروني'
            });
        } else {
            console.log(`❌ محاولة فاشلة بكلمة السر: ${password}`);
            return res.status(401).json({
                success: false,
                error: 'كلمة السر خاطئة'
            });
        }
    } catch (error) {
        console.error('خطأ في الخادم:', error);
        return res.status(500).json({
            success: false,
            error: 'حدث خطأ في الخادم'
        });
    }
});

// نقطة نهاية المشرف لتغيير كلمة السر يدوياً
app.post('/admin/change-password', async (req, res) => {
    try {
        const { adminPassword, newPassword } = req.body;
        
        if (!adminPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'كلمة سر المشرف وكلمة السر الجديدة مطلوبتان'
            });
        }
        
        if (adminPassword !== ADMIN_PASSWORD) {
            return res.status(401).json({
                success: false,
                error: 'كلمة سر المشرف خاطئة'
            });
        }
        
        if (!isValidPassword(newPassword)) {
            return res.status(400).json({
                success: false,
                error: 'كلمة السر الجديدة يجب أن تكون 7 أحرف انجليزية فقط (صغيرة وكبيرة)'
            });
        }
        
        const oldPassword = CORRECT_PASSWORD;
        CORRECT_PASSWORD = newPassword;
        
        await sendEmail(newPassword, 'تغيير يدوي من قبل المشرف');
        
        console.log(`🔧 المشرف غير كلمة السر من ${oldPassword} إلى ${newPassword}`);
        
        return res.json({
            success: true,
            message: 'تم تغيير كلمة السر بنجاح وإرسالها إلى البريد الإلكتروني'
        });
        
    } catch (error) {
        console.error('خطأ في تغيير كلمة السر:', error);
        return res.status(500).json({
            success: false,
            error: 'حدث خطأ في تغيير كلمة السر'
        });
    }
});

// نقطة نهاية المشرف لعرض حالة النظام
app.get('/admin/status', (req, res) => {
    try {
        const { adminPassword } = req.query;
        
        if (adminPassword !== ADMIN_PASSWORD) {
            return res.status(401).json({
                success: false,
                error: 'كلمة سر المشرف خاطئة'
            });
        }
        
        return res.json({
            success: true,
            systemStatus: {
                currentPassword: CORRECT_PASSWORD,
                passwordLength: CORRECT_PASSWORD.length,
                emailConfigured: !!process.env.EMAIL_USER,
                serverUptime: Math.floor(process.uptime()) + ' ثانية',
                timestamp: new Date().toLocaleString('ar-EG')
            }
        });
        
    } catch (error) {
        console.error('خطأ في عرض الحالة:', error);
        return res.status(500).json({
            success: false,
            error: 'حدث خطأ في عرض حالة النظام'
        });
    }
});

// نقطة نهاية للصحة
app.get('/health-check', (req, res) => {
    res.status(200).json({
        success: true,
        message: '✅ السيرفر يعمل بشكل صحيح',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// نقطة نهاية للجذر
app.get('/', (req, res) => {
    res.json({
        message: 'مرحباً بك في سيرفر إدارة كلمات السر',
        version: '2.0',
        status: 'يعمل ✅',
        endpoints: {
            health: '/health-check',
            verifyPassword: '/verify-password (POST)',
            admin: {
                changePassword: '/admin/change-password (POST)',
                status: '/admin/status (GET)'
            }
        }
    });
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log('🚀 ========== بدء تشغيل السيرفر ==========');
    console.log(`✅ السيرفر يعمل على المنفذ ${PORT}`);
    console.log(`📍 العنوان: http://localhost:${PORT}`);
    console.log(`🔐 كلمة السر الحالية: ${CORRECT_PASSWORD}`);
    console.log(`📧 البريد الإلكتروني: ${process.env.EMAIL_USER ? 'مضبوط ✅' : 'غير مضبوط ❌'}`);
    console.log('====================================');
});