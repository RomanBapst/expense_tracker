
import multer from 'multer';
import { Request as JWTRequest } from "express-jwt";
// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Directory to save uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Append timestamp to the file name
  }
});


const upload = multer({ storage }); // Specify upload directory

// Extend JWTRequest to include file property
export interface RequestWithFile extends JWTRequest {
  file?: Express.Multer.File;
}

export default upload;