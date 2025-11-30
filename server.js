const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// التحقق من وجود متغيرات البيئة الأساسية
const requiredEnvVars = ['ADMIN_PASSWORD'];
requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
        console.warn(`⚠️  تحذير: متغير البيئة ${envVar} غير موجود`);
    }
});

// كلمة السر الصحيحة الحالية
let CORRECT_PASSWORD = process.env.INITIAL_PASSWORD || "Abc1234";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

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
    
    // تأكد من وجود حرف كبير وحرف صغير على الأقل
    newPassword += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    newPassword += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    
    // إكمال الباقي
    const allChars = uppercase + lowercase;
    for (let i = 2; i < 7; i++) {
        newPassword += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // خلط الأحرف
    return newPassword.split('').sort(() => 0.5 - Math.random()).join('');
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
            
            console.log(`✅ تحقق ناجح - تم تغيير كلمة السر من ${oldPassword} إلى ${newPassword}`);
            
            return res.json({
                success: true,
                message: 'تم التحقق بنجاح!',
                newPassword: newPassword // نرسل كلمة السر الجديدة في الرد
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
        
        console.log(`🔧 المشرف غير كلمة السر من ${oldPassword} إلى ${newPassword}`);
        
        return res.json({
            success: true,
            message: 'تم تغيير كلمة السر بنجاح',
            newPassword: newPassword
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
        
        if (!adminPassword) {
            return res.status(400).json({
                success: false,
                error: 'كلمة سر المشرف مطلوبة'
            });
        }
        
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
        environment: process.env.NODE_ENV || 'development',
        currentPasswordLength: CORRECT_PASSWORD.length
    });
});

// نقطة نهاية للجذر
app.get('/', (req, res) => {
    res.json({
        message: 'مرحباً بك في سيرفر إدارة كلمات السر',
        version: '3.0 - بدون إيميل',
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

// معالجة الأخطاء غير المتوقعة
process.on('uncaughtException', (error) => {
    console.error('❌ خطأ غير متوقع:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise مرفوض غير معالج:', reason);
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log('🚀 ========== بدء تشغيل السيرفر ==========');
    console.log(`✅ السيرفر يعمل على المنفذ ${PORT}`);
    console.log(`📍 العنوان: http://localhost:${PORT}`);
    console.log(`🔐 كلمة السر الحالية: ${CORRECT_PASSWORD}`);
    console.log('====================================');
});