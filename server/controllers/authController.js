import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import { createNotification } from '../utils/notification.js';

import GoogleToken from '../models/GoogleToken.js';
import FacebookToken from '../models/FacebookToken.js';
import UserAccounts from '../models/UserAccounts.js';
import Conversation from '../models/Conversation.js';
import Ga4Metric from '../models/Ga4Metric.js';
import GscMetric from '../models/GscMetric.js';
import GoogleAdsMetric from '../models/GoogleAdsMetric.js';
import FacebookAdsMetric from '../models/FacebookAdsMetric.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import WeeklyInsight from '../models/WeeklyInsight.js';
import AiIntelligence from '../models/AiIntelligence.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../utils/emailService.js';

const generateToken = (userId, email) => {
    return jwt.sign({ userId, email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

export const register = async (req, res) => {
    const { name, email, password } = req.body;
    const userExists = await User.findOne({ email });

    if (userExists) {
        return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    const rawToken = crypto.randomBytes(32).toString('hex');
    const emailVerifyToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await User.create({
        displayName: name,
        email: email.toLowerCase(),
        passwordHash,
        emailVerifyToken,
        emailVerified: false
    });

    // Create a Welcome Notification
    await createNotification(user._id, {
        type: 'info',
        title: 'Welcome to RankPilot! 🚀',
        message: 'We are excited to help you grow your analytics. Start by connecting your Google or Meta accounts to see your data in action.',
        source: 'system',
        actionLabel: 'Connect Accounts',
        actionPath: '/connect-accounts'
    });


    try {
        await sendVerificationEmail(email, rawToken);
    } catch (emailErr) {
        console.error('Verification email failed:', emailErr.message);
    }

    res.status(201).json({ message: 'Account created! Please check your email to verify your account.' });
};

export const verifyEmail = async (req, res) => {
    const { token } = req.params;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ emailVerifyToken: hashedToken });

    if (!user) {
        return res.status(400).json({ success: false, code: 'TOKEN_INVALID', message: 'Invalid or already used verification link.' });
    }

    if (user.emailVerified) {
        user.emailVerifyToken = null;
        await user.save();
        return res.status(200).json({ message: 'Email already verified. You can log in.' });
    }

    user.emailVerified = true;
    user.emailVerifyToken = null;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully! You can now log in.' });
};

export const resendVerification = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always respond generically to avoid email enumeration
    if (!user) {
        return res.status(200).json({ message: 'If that account exists and is unverified, a new link has been sent.' });
    }

    if (user.emailVerified) {
        return res.status(200).json({ message: 'This account is already verified. You can log in.' });
    }

    // Generate fresh token
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.emailVerifyToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    await user.save();

    try {
        await sendVerificationEmail(user.email, rawToken);
    } catch (emailErr) {
        console.error('Resend verification email failed:', emailErr.message);
    }

    res.status(200).json({ message: 'A new verification link has been sent to your email.' });
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    
    const safeEmail = String(email || '').toLowerCase();
    const user = await User.findOne({ email: safeEmail });

    if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
        return res.status(423).json({ success: false, message: 'Account locked' });
    }

    // Account was created via Google/Facebook OAuth — no password set
    if (!user.passwordHash) {
        return res.status(400).json({
            success: false,
            code: 'OAUTH_ACCOUNT',
            message: 'This account was created with Google sign-in. Please continue with Google, or use "Forgot Password" to set a password.'
        });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
        user.loginAttempts += 1;
        if (user.loginAttempts >= 5) {
            user.lockUntil = Date.now() + 15 * 60 * 1000;
        }
        await user.save();
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    if (!user.emailVerified) {
        return res.status(403).json({ success: false, message: 'Please verify your email before logging in. Check your inbox for the verification link.' });
    }

    const googleToken = await GoogleToken.findOne({ userId: user._id });
    const facebookToken = await FacebookToken.findOne({ userId: user._id });
    const accounts = await UserAccounts.findOne({ userId: user._id });

    let connectedSources = [];
    if (googleToken) {
        connectedSources.push('google');
        if (accounts?.ga4PropertyId) connectedSources.push('ga4');
        if (accounts?.gscSiteUrl) connectedSources.push('gsc');
        if (accounts?.googleAdsCustomerId) connectedSources.push('google-ads');
    }
    if (facebookToken) {
        connectedSources.push('facebook');
        if (accounts?.facebookAdAccountId) connectedSources.push('facebook-ads');
    }

    res.status(200).json({
        token: generateToken(user._id, user.email),
        user: { 
            id: user._id, 
            name: user.displayName, 
            email: user.email, 
            avatar: user.avatar, 
            connectedSources
        }
    });
};

export const logout = async (req, res) => {
    res.status(200).json({ message: 'Logged out successfully' });
};

export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (user) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        user.passwordResetExp = Date.now() + 3600000; // 1 hour
        await user.save();

        try {
            await sendPasswordResetEmail(user.email, rawToken);
        } catch (emailErr) {
            console.error('Email send failed:', emailErr.message);
        }
    }

    res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
};

export const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExp: { $gt: Date.now() } });

    if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.passwordResetToken = null;
    user.passwordResetExp = null;
    await user.save();

    res.status(200).json({ message: 'Password reset successful' });
};

export const authCallback = async (req, res) => {
    const token = generateToken(req.user._id, req.user.email);
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
};

export const getMe = async (req, res) => {
    const googleToken = await GoogleToken.findOne({ userId: req.user._id });
    const facebookToken = await FacebookToken.findOne({ userId: req.user._id });
    const accounts = await UserAccounts.findOne({ userId: req.user._id });

    let connectedSources = [];
    if (googleToken) {
        connectedSources.push('google');
        if (accounts?.ga4PropertyId) connectedSources.push('ga4');
        if (accounts?.gscSiteUrl) connectedSources.push('gsc');
        if (accounts?.googleAdsCustomerId) connectedSources.push('google-ads');
    }
    if (facebookToken) {
        connectedSources.push('facebook');
        if (accounts?.facebookAdAccountId) connectedSources.push('facebook-ads');
    }

    res.status(200).json({
        user: { 
            id: req.user._id, 
            name: req.user.displayName, 
            email: req.user.email, 
            avatar: req.user.avatar, 
            connectedSources
        },
        connectedSources
    });
};

export const deleteMe = async (req, res) => {
    const userId = req.user._id;

    // 1. Find all conversations for this user to delete their messages
    const userConversations = await Conversation.find({ userId }).select('_id');
    const convIds = userConversations.map(c => c._id);

    // 2. Delete all related data
    await Promise.all([
        GoogleToken.deleteMany({ userId }),
        FacebookToken.deleteMany({ userId }),
        UserAccounts.deleteMany({ userId }),
        Ga4Metric.deleteMany({ 'metadata.userId': userId }),
        GscMetric.deleteMany({ 'metadata.userId': userId }),
        GoogleAdsMetric.deleteMany({ 'metadata.userId': userId }),
        FacebookAdsMetric.deleteMany({ 'metadata.userId': userId }),
        Notification.deleteMany({ userId }),
        WeeklyInsight.deleteMany({ userId }),
        AiIntelligence.deleteMany({ userId }),
        Message.deleteMany({ conversationId: { $in: convIds } }),
        Conversation.deleteMany({ userId }),
        User.findByIdAndDelete(userId)
    ]);

    res.status(200).json({ message: 'Account and all associated records deleted permanently.' });
};
