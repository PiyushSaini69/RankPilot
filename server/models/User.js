import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String },
    displayName: { type: String, required: true },
    avatar: { type: String },
    emailVerified: { type: Boolean, required: true, default: false },
    emailVerifyToken: { type: String },
    passwordResetToken: { type: String },
    passwordResetExp: { type: Date },
    googleId: { type: String, sparse: true },
    facebookId: { type: String, sparse: true },
    loginAttempts: { type: Number, required: true, default: 0 },
    lockUntil: { type: Date }
}, {
    timestamps: true
});

export default mongoose.model('User', userSchema);
