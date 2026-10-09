package lk.dmc.service;

import java.util.Map;

/**
 * Resolves GPS coordinates to the nearest Sri Lankan administrative district.
 * Uses approximate district centroids, which is accurate enough to route reports
 * to district dashboards; points outside Sri Lanka resolve to null.
 */
public final class DistrictLocator {
    private static final Map<String, double[]> CENTROIDS = Map.ofEntries(
        Map.entry("Colombo", new double[] {6.90, 79.95}),
        Map.entry("Gampaha", new double[] {7.09, 80.03}),
        Map.entry("Kalutara", new double[] {6.58, 80.12}),
        Map.entry("Kandy", new double[] {7.29, 80.70}),
        Map.entry("Matale", new double[] {7.65, 80.70}),
        Map.entry("Nuwara Eliya", new double[] {6.97, 80.77}),
        Map.entry("Galle", new double[] {6.13, 80.25}),
        Map.entry("Matara", new double[] {6.05, 80.55}),
        Map.entry("Hambantota", new double[] {6.25, 81.12}),
        Map.entry("Jaffna", new double[] {9.67, 80.08}),
        Map.entry("Kilinochchi", new double[] {9.39, 80.40}),
        Map.entry("Mannar", new double[] {8.88, 80.05}),
        Map.entry("Vavuniya", new double[] {8.75, 80.50}),
        Map.entry("Mullaitivu", new double[] {9.20, 80.75}),
        Map.entry("Batticaloa", new double[] {7.73, 81.60}),
        Map.entry("Ampara", new double[] {7.30, 81.67}),
        Map.entry("Trincomalee", new double[] {8.59, 81.10}),
        Map.entry("Kurunegala", new double[] {7.49, 80.36}),
        Map.entry("Puttalam", new double[] {8.03, 79.84}),
        Map.entry("Anuradhapura", new double[] {8.31, 80.40}),
        Map.entry("Polonnaruwa", new double[] {7.94, 81.00}),
        Map.entry("Badulla", new double[] {6.99, 81.06}),
        Map.entry("Monaragala", new double[] {6.87, 81.35}),
        Map.entry("Ratnapura", new double[] {6.68, 80.40}),
        Map.entry("Kegalle", new double[] {7.25, 80.35}));

    private DistrictLocator() {}

    public static String locate(Object latitude, Object longitude) {
        if (!(latitude instanceof Number lat) || !(longitude instanceof Number lon)) return null;
        double la = lat.doubleValue(), lo = lon.doubleValue();
        if (la < 5.8 || la > 10.0 || lo < 79.4 || lo > 82.1) return null;
        String best = null;
        double bestDistance = Double.MAX_VALUE;
        for (var entry : CENTROIDS.entrySet()) {
            double dLat = la - entry.getValue()[0], dLon = lo - entry.getValue()[1];
            double distance = dLat * dLat + dLon * dLon;
            if (distance < bestDistance) {
                bestDistance = distance;
                best = entry.getKey();
            }
        }
        return best;
    }
}
