const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const leaveController = require('../controllers/leaveController');
const { authenticateToken } = require('../middleware/auth');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/leaves/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

router.use(authenticateToken); // Protection

router.get('/balance', leaveController.getLeaveBalance);
router.post('/apply', upload.single('document'), leaveController.applyLeave);
router.get('/my-leaves', leaveController.getMyLeaves);

module.exports = router;
