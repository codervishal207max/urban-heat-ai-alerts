import unittest

from backend.services.heat_service import get_heat_map


class LiveTempPerAreaTests(unittest.TestCase):
    def test_heat_map_contains_live_temperature_for_each_zone(self):
        payload = get_heat_map("delhi")
        self.assertTrue(payload["features"])

        first_zone = payload["features"][0]["properties"]
        self.assertIn("live_temp_c", first_zone)
        self.assertIsInstance(first_zone["live_temp_c"], (int, float))
        self.assertGreater(first_zone["live_temp_c"], 0)


if __name__ == "__main__":
    unittest.main()
