package lk.dmc.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import lk.dmc.config.FirebaseGateway;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReportPhotoStorage {
    private final FirebaseGateway firebase;
    public ReportPhotoStorage(FirebaseGateway firebase) {
        this.firebase = firebase;
    }
    public record Photo(byte[] bytes, String contentType) {}
    public Photo validate(MultipartFile file) {
        if (file == null || file.isEmpty())
            return null;
        if (file.getSize() > 2 * 1024 * 1024)
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Photo must be no larger than 2 MB.");
        try {
            byte[] bytes = file.getBytes();
            try (var stream = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                var readers = ImageIO.getImageReaders(stream);
                if (!readers.hasNext())
                    throw invalidPhoto();
                var reader = readers.next();
                try {
                    reader.setInput(stream);
                    String format = reader.getFormatName().toLowerCase();
                    if (!format.equals("jpeg") && !format.equals("png"))
                        throw invalidPhoto();
                    int width = reader.getWidth(0), height = reader.getHeight(0);
                    if (width < 1 || height < 1 || (long) width * height > 20_000_000)
                        throw invalidPhoto();
                    return new Photo(bytes, format.equals("jpeg") ? "image/jpeg" : "image/png");
                } finally {
                    reader.dispose();
                }
            }
        } catch (IOException error) {
            throw invalidPhoto();
        }
    }
    public void upload(String path, Photo photo) {
        try {
            firebase.bucket().create(path, photo.bytes(), photo.contentType());
        }
        catch (ResponseStatusException error) {
            throw error;
        }
        catch (RuntimeException error) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Photo upload failed. Your report was not submitted. Please try again.");
        }
    }
    public Photo download(String path) {
        try {
            var blob = firebase.bucket().get(path);
            if (blob == null)
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found.");
            return new Photo(blob.getContent(), blob.getContentType());
        } catch (ResponseStatusException error) {
            throw error;
        }
        catch (RuntimeException error) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Photo is temporarily unavailable.");
        }
    }
    public void delete(String path) {
        if (path == null)
            return;
        try {
            var blob = firebase.bucket().get(path);
            if (blob != null)
                blob.delete();
        }
        catch (RuntimeException ignored) {
            /* A lifecycle retention rule can clean up orphaned uploads. */
        }
    }
    private ResponseStatusException invalidPhoto() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid JPEG or PNG image up to 20 megapixels.");
    }
}
