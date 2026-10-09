package lk.dmc;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import com.cloudinary.Cloudinary;
import lk.dmc.service.ReportPhotoStorage;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class ReportPhotoStorageTests {
    final ReportPhotoStorage storage = new ReportPhotoStorage(mock(Cloudinary.class));
    @Test
    void detectsImageTypeFromBytesRatherThanSuppliedMime() throws Exception {
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", output);
        var result = storage.validate(new MockMultipartFile("photo", "photo.txt", "text/plain", output.toByteArray()));
        assertEquals("image/png", result.contentType());
    }
    @Test
    void rejectsFakeImageAndOversizedUpload() {
        assertThrows(ResponseStatusException.class,
            () -> storage.validate(new MockMultipartFile("photo", "fake.png", "image/png", "<html>invalid</html>".getBytes())));
        assertThrows(ResponseStatusException.class,
            () -> storage.validate(new MockMultipartFile("photo", new byte[2 * 1024 * 1024 + 1])));
    }
}
