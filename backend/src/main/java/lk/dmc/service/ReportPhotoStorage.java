package lk.dmc.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URI;
import javax.imageio.ImageIO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReportPhotoStorage {
    private static final Logger log = LoggerFactory.getLogger(ReportPhotoStorage.class);
    private final Cloudinary cloudinary;

    @Autowired
    public ReportPhotoStorage(ObjectProvider<Cloudinary> cloudinaryProvider) {
        this.cloudinary = cloudinaryProvider.getIfAvailable();
    }

    public ReportPhotoStorage(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
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
            cloudinary().uploader().upload(photo.bytes(), ObjectUtils.asMap(
                "public_id", path,
                "resource_type", "image",
                "overwrite", false,
                "type", "upload"));
        } catch (IOException | RuntimeException error) {
            log.error("Unable to upload hazard report photo to Cloudinary at {}", path, error);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Photo upload failed. Check the Cloudinary backend configuration and try again.");
        }
    }

    public Photo download(String path) {
        HttpURLConnection connection = null;
        try {
            String url = cloudinary().url().secure(true).resourceType("image").publicId(path).generate();
            connection = (HttpURLConnection) URI.create(url).toURL().openConnection();
            connection.setConnectTimeout(10_000);
            connection.setReadTimeout(20_000);
            if (connection.getResponseCode() != HttpURLConnection.HTTP_OK)
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Photo not found.");
            String contentType = connection.getContentType();
            if (!"image/jpeg".equals(contentType) && !"image/png".equals(contentType))
                throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Unsupported photo type.");
            return new Photo(connection.getInputStream().readAllBytes(), contentType);
        } catch (ResponseStatusException error) {
            throw error;
        } catch (IOException | RuntimeException error) {
            log.error("Unable to download hazard report photo from Cloudinary at {}", path, error);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Photo is temporarily unavailable.");
        } finally {
            if (connection != null)
                connection.disconnect();
        }
    }

    public void delete(String path) {
        if (path == null)
            return;
        try {
            cloudinary().uploader().destroy(path, ObjectUtils.asMap("resource_type", "image", "type", "upload"));
        } catch (IOException | RuntimeException error) {
            log.warn("Unable to delete orphaned Cloudinary photo {}", path, error);
        }
    }

    private ResponseStatusException invalidPhoto() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,
            "Choose a valid JPEG or PNG image up to 20 megapixels.");
    }

    private Cloudinary cloudinary() {
        if (cloudinary == null)
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Photo storage is not configured on the server.");
        return cloudinary;
    }
}
