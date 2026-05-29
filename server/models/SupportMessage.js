import mongoose from 'mongoose';

const supportMessageSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        default: 'General Inquiry',
        trim: true
    },
    priority: {
        type: String,
        default: 'Standard',
        trim: true
    }
}, {
    timestamps: true
});

export default mongoose.model('SupportMessage', supportMessageSchema);
