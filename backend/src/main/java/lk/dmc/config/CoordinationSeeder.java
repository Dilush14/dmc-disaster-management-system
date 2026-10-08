package lk.dmc.config;

import lk.dmc.repository.CoordinationSeedData;
import lk.dmc.repository.CoordinationStore;
import lk.dmc.repository.FirestoreCoordinationStore;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Opt-in demo data for an empty Firestore project (COORDINATION_SEED=true). The in-memory store seeds itself. */
@Configuration
@ConditionalOnProperty(name = "app.coordination.seed", havingValue = "true")
public class CoordinationSeeder {
    @Bean
    ApplicationRunner seedCoordination(CoordinationStore store) {
        return args -> {
            if (store instanceof FirestoreCoordinationStore && store.list(CoordinationStore.SHELTERS).isEmpty())
                CoordinationSeedData.seed(store);
        };
    }
}
