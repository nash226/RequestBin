import mongoose, { Document, Schema, Types } from 'mongoose';
const mongourl = process.env.MONGODB_URI; //this will definitely exist in .env
await mongoose.connect(mongourl);
const requestBodySchema = new mongoose.Schema({
    requestPayload: {
        type: Schema.Types.Mixed,
        required: true,
        default: {}
    }
});
// strips MongoDB internals (_id, __v) and renames _id to id before the document is sent to the client
requestBodySchema.set("toJSON", {
    transform: (_, returnedObj) => {
        const obj = returnedObj; // temporary
        obj.id = returnedObj._id.toString();
        delete obj._id;
        delete obj.__v;
        return obj;
    }
});
export const mongoExecutor = mongoose.model("RequestBody", requestBodySchema);
//# sourceMappingURL=mongo_schema.js.map