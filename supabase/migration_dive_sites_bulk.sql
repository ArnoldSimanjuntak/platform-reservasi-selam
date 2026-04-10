-- =============================================
-- MIGRATION: Extend dive_sites & Bulk Insert 63 Lembeh Dive Sites
-- Run this in the Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. ADD NEW COLUMNS (kedalaman, waktu tempuh, habitat)
--    These columns are safe to add if they don't exist yet.
-- =============================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dive_sites' AND column_name = 'kedalaman_meter'
  ) THEN
    ALTER TABLE dive_sites ADD COLUMN kedalaman_meter INTEGER;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dive_sites' AND column_name = 'waktu_tempuh_kapal_menit'
  ) THEN
    ALTER TABLE dive_sites ADD COLUMN waktu_tempuh_kapal_menit INTEGER;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dive_sites' AND column_name = 'habitat'
  ) THEN
    ALTER TABLE dive_sites ADD COLUMN habitat VARCHAR(100);
  END IF;
END $$;

-- =============================================
-- 2. CLEAR EXISTING SEED DATA (optional safety)
--    Remove old 3 test entries so we don't have duplicates
-- =============================================
-- DELETE FROM dive_sites;   -- Uncomment jika ingin menghapus data lama

-- =============================================
-- 3. BULK INSERT: 63 DIVE SITES from data_selam.json
--    zone_level dihitung otomatis dari waktu_tempuh_kapal:
--      <= 10 menit -> Zona 1 (surcharge 0)
--      <= 20 menit -> Zona 2 (surcharge 150000)
--      > 20 menit  -> Zona 3 (surcharge 300000)
-- =============================================

INSERT INTO dive_sites (name, latitude, longitude, description, zone_level, surcharge_fee, kedalaman_meter, waktu_tempuh_kapal_menit, habitat)
VALUES
  ('Batu Angus', 1.5070808, 125.2468088, 'This is a sheltered series of lava bowls offering good hard coral growth (esp. lettuce corals) in shallow depths, no current and visibility better than anywhere else in the Strait. The dive site is named Batu Angus because ''Batu'' means rock and ''Angus'' means burns, signifying the hardened lava rock in the water.', 3, 300000, 28, 25, 'Coral'),
  ('Aw Shucks', 1.5008168, 125.2424585, 'Next to a pearl farm, this site has a verdant mix of coral and sponge growth in the shallows with a sand slope below. The first divers to explore this site proclaimed ''Aw Shucks!'' after they found a lot of critters.', 2, 150000, 28, 16, 'Mixed'),
  ('Hey Nus', 1.4990929, 125.2422211, 'It is a muck site with a gentle sand slope that drops down to coral patches in about 14-20 meter depth. There are a lot of scattered Physogyra corals and rope sponges along the slope.', 2, 150000, 25, 16, 'Mixed'),
  ('Hairball', 1.4974972, 125.2422262, 'This is the most famous of the muck sites and one of the four most-dived sites in the Strait. The sand slope here is exceptionally rich.', 2, 150000, 28, 16, 'Sand & Rubble'),
  ('Surprise', 1.4957328, 125.241764, 'Located just south of Hairball, this site earned its name because divers are always surprised by what they find. The gentle sand slope transitions to rubble patches offering a mix of coral growth, sponges, and excellent macro subjects including frogfish and various nudibranchs.', 2, 150000, 22, 15, 'Mixed'),
  ('TK (Teluk Kambahu) 1, 2, 3', 1.4934459, 125.2366851, 'These are sheltered sites that are very popular: this entire area offers a wide variety of critters in shallow, easy conditions.', 2, 150000, 25, 12, 'Sand & Rubble'),
  ('Retak Larry (Larrys Crack)', 1.4901425, 125.2370284, 'Another sand site, but with a small stand of healthy coral in the shallows. This is the most popular site in Kambahu Bay.', 1, 0, 25, 10, 'Sand & Rubble'),
  ('Magic Crack', 1.4891269, 125.2391822, 'A continuance of the gentle sand slope, the highlight of this dive is a coral and rubble patch stretching from 12 – 27 meters and is the best place in Lembeh to find thorny seahorses.', 2, 150000, 25, 16, 'Mixed'),
  ('Magic Rock', 1.4874288, 125.2408288, 'This site is named after a rock at 15m in the coral shallow area and sand slope which is a cleaning station where many different creatures can be found!', 1, 0, 28, 10, 'Mixed'),
  ('Nudi Retreat', 1.4858198, 125.2414241, 'The most heavily-dived site in the strait, this is a lovely coral bowl in the shallows, turning into a sand slope with encrusted boulders down below.', 1, 0, 29, 10, 'Mixed'),
  ('Makawide', 1.4816689, 125.2383698, 'Excellent coral growth in the shallows, with a wall like Nudi Retreat. On the silty slope below the wall rise a few rocky pinnacles.', 2, 150000, 29, 13, 'Mixed'),
  ('Jahir', 1.4792372, 125.2363678, 'A very popular muck site, just a black sand slope with some rope sponge growth and a few coral outcrops in the shallows.', 1, 0, 20, 10, 'Sand & Rubble'),
  ('Aer Prang', 1.473168, 125.23428, 'Air Prang is a large, spread-out gradual sand slope which is popular for night diving but also potentially great during the day.', 1, 0, 25, 7, 'Mixed'),
  ('Sarena North', 1.4611905, 125.2319444, 'This site located north of Sarena island has a coral slope at the top, sandy bottom and can be done as a deep dive.', 1, 0, 30, 5, 'Mixed'),
  ('Slow Poke', 1.4584234, 125.2312148, 'A seldom-dived site between the more popular Retak Larry and Magic Crack, this gentle sand slope has some rubble and a single bommie.', 1, 0, 20, 10, 'Sand & Rubble'),
  ('Serena Besar', 1.4595817, 125.2338971, 'The site is a combination of coral, rubble area and a sandy bottom. In the shallow part the nice coral area and some time you can see juvenile barramundi cod.', 1, 0, 20, 5, 'Mixed'),
  ('Nudi Falls', 1.4606494, 125.2270824, 'One of the three most-dived sites (along with Nudi Retreat & Hairball), a beautiful sheer wall with a rock pile below, then a sand slope.', 1, 0, 20, 7, 'Mixed'),
  ('Serena Patah', 1.4553863, 125.2252391, 'Located near the broken part of Serena island, this site features a mix of hard coral wall and sandy slope. Known for blue-ringed octopus sightings and ghost pipefish hiding among the sea fans and black coral growth.', 1, 0, 25, 8, 'Mixed'),
  ('Critter Hunt', 1.4547109, 125.224359, 'It has a healthy reef in the shallows with many different species of anemones. A little bit deeper, there is a gentle rubble slope.', 1, 0, 25, 8, 'Mixed'),
  ('Tanduk Rusa', 1.4604619, 125.2238302, 'Named after the antler-shaped coral found here, this site features a mix of reef and rubble slope. Close to the Mawali Wreck, the shallows have vibrant hard coral growth while deeper sections offer soft corals and sponge gardens favored by nudibranchs.', 1, 0, 24, 7, 'Mixed'),
  ('Mawali Wreck', 1.4597112, 125.2222424, 'A WWII-era Japanese freighter lying on its port side in 15–30 meters of water. The wreck is heavily encrusted with coral and sponges, hosting lionfish, pipefish, nudibranchs, and occasionally schooling barracuda and trevally.', 1, 0, 30, 8, 'Wreck'),
  ('Police Pier', 1.4583598, 125.2209549, 'Named after the nearby police station, this classic muck dive site features dark volcanic sand scattered with rubble and debris. A hotspot for seahorses, scorpionfish, frogfish, and various crustaceans that make it one of Lembeh''s most rewarding macro photography locations.', 1, 0, 18, 6, 'Sand & Rubble'),
  ('Police Pier 2', 1.4574803, 125.2202254, 'The second section of Police Pier extends along a darker volcanic sand slope. Rich in macro life including flamboyant cuttlefish, wonderpus, and coconut octopus, this area is also popular for night dives where mandarinfish and bobbit worms are regularly spotted.', 1, 0, 20, 6, 'Sand & Rubble'),
  ('Pintu Kota', 1.4533976, 125.2118496, 'This site marks the ''gateway to the city'' (pintu kota) of Bitung''s underwater realm. A gradual sand and coral slope dropping to 22 meters hosts ornate ghost pipefish, Ambon scorpionfish, and rare Pikachu nudibranchs among the scattered coral bommies.', 2, 150000, 22, 12, 'Mixed'),
  ('Pintu Kolada', 1.4528506, 125.2119784, 'A popular site featuring coral gardens in the shallows at 5–7 meters transitioning into a sandy rubble slope. Known for the rare Pikachu nudibranch (Thecacera sp.) and wonderpus octopus, with excellent visibility most of the year.', 2, 150000, 25, 12, 'Mixed'),
  ('Pantai Parigi', 1.4376035, 125.1683287, 'Located on the far western coast near Bitung harbor, this sheltered beach dive features a gentle sandy slope ideal for beginner divers and check dives. The shallow rubble area hosts juvenile fish, flatworms, and a variety of shrimp and crab species.', 3, 300000, 15, 25, 'Sand & Rubble'),
  ('Tanjung Kubur', 1.4323347, 125.1883956, 'Named after the cemetery on the headland above, this muck site has a gradual dark sand slope with scattered rubble. Known for mimic octopus, snake eels, and stargazers. The volcanic substrate creates a dramatic contrast for macro photography.', 2, 150000, 20, 18, 'Sand & Rubble'),
  ('Madidir', 1.4316652, 125.1920502, 'A sheltered muck site near the Madidir area of mainland Bitung. The dark volcanic sand slope is ideal for night diving and is famous for mandarinfish, bobbit worms, and various species of octopus hiding in coconut shells and discarded bottles.', 2, 150000, 18, 15, 'Sand & Rubble'),
  ('Beting Pasir', 1.4319328, 125.1957766, 'A sandbar formation (beting pasir) that creates a unique underwater landscape. The shallow sand flat transitions to a gentle slope hosting a variety of flatfish, snake eels, and pipefish. The sandy environment is also home to mantis shrimp and burrowing gobies.', 2, 150000, 16, 14, 'Sand & Rubble'),
  ('Tanjung Kuning', 1.4326407, 125.1971928, 'Named after the distinctive yellowish rock formations at the headland, this site offers a combination of rocky reef in the shallows and black sand slope below. Great for finding leaf scorpionfish, robust ghost pipefish, and fire urchin riders.', 2, 150000, 20, 13, 'Mixed'),
  ('Jiko 1', 1.432748, 125.1999823, 'The first of the Jiko dive sites, located on the southern strait. A gradual volcanic sand slope with scattered rubble provides habitat for frogfish, seahorses, and various species of shrimp gobies. Night dives here reveal Spanish dancer nudibranchs.', 2, 150000, 22, 12, 'Sand & Rubble'),
  ('Jiko 2', 1.4335846, 125.2016131, 'Continuing from Jiko 1, this section features a slightly steeper sand slope rich in macro subjects. Highlights include hairy frogfish, blue-ringed octopus, and various nudibranch species. Scattered rope sponges provide shelter for ornate ghost pipefish.', 2, 150000, 24, 11, 'Sand & Rubble'),
  ('Jiko 3', 1.4331725, 125.205454, 'The deepest of the Jiko series, this site has a mix of sand, rubble, and coral outcrops. The coral patches between 10–15 meters attract cleaning stations visited by sweetlips, groupers, and batfish, while the sand slope below hosts coconut octopus and gobies.', 1, 0, 25, 10, 'Mixed'),
  ('Divers Lodge House Reef', 1.4344596, 125.2085225, 'A convenient house reef accessible directly from the shore. The shallow coral area leads to a gentle muck slope perfect for unlimited day and night dives. Seahorses, cuttlefish, and juvenile fish are regularly spotted in the turtle grass beds.', 1, 0, 18, 10, 'Mixed'),
  ('Pante Abo', 1.4364219, 125.2123634, 'A dark sand muck site on the Lembeh Island side featuring a gentle slope strewn with rope sponges and sea whips. Known for excellent critter sightings including flamboyant cuttlefish, devil scorpionfish, and a variety of shrimp species in the anemones.', 1, 0, 20, 10, 'Sand & Rubble'),
  ('Kareko Pasir', 1.4374087, 125.2131144, 'The sandy version of the Kareko sites (kareko = coral, pasir = sand). A black volcanic sand slope with minimal coral cover but abundant macro life including mimic octopus, various flatfish, and burrowing shrimp gobies. Excellent for wide-angle muck shots.', 1, 0, 22, 10, 'Sand & Rubble'),
  ('Kareko Batu', 1.4377952, 125.2182396, 'The rocky counterpart of Kareko Pasir, this site features encrusted boulders (batu = rock) rising from the sand slope. The rocks are covered in sponges and soft corals attracting pygmy seahorses, leaf scorpionfish, and various pipefish species.', 1, 0, 24, 9, 'Mixed'),
  ('Tanjung Tebal', 1.4394898, 125.2227994, 'Named after the thick (tebal) headland promontory, this site features a healthy coral reef in the shallows dropping to a sandy slope. The coral area hosts cleaning stations with cleaner wrasse and shrimp, while the deeper sand reveals mimic octopus and snake eels.', 1, 0, 22, 8, 'Mixed'),
  ('Air Bajo 1', 1.4401871, 125.2260325, 'The first of three Air Bajo sites located in a sheltered bay. A shallow sandy flat at 4–6 meters transitions to a gradual slope ideal for spotting coconut octopus, seahorses, and the famous Lembeh Sea Dragon (pipefish). Perfect for long, relaxed macro dives.', 1, 0, 18, 7, 'Sand & Rubble'),
  ('Air Bajo 2', 1.4413026, 125.2240155, 'Continuing south from Air Bajo 1, this section has slightly more rubble and coral fragments mixed into the sand. Known for excellent crustacean sightings including boxer crabs, harlequin shrimp, and emperor shrimp riding on sea cucumbers.', 1, 0, 20, 7, 'Sand & Rubble'),
  ('Tanjung Lampu', 1.4539133, 125.2371542, 'Named after the lighthouse (lampu = light) at the cape, this site offers a dramatic wall in the shallows transitioning to a sandy slope. The wall crevices shelter moray eels and lionfish, while the sand is home to robust ghost pipefish and leaf scorpionfish.', 1, 0, 22, 6, 'Mixed'),
  ('Batu Sandar', 1.4551567, 125.2411882, 'Large boulders (batu = rock) lean against each other creating swim-throughs and overhangs at 10–18 meters. The rock surfaces are blanketed in sponges and tunicates sheltering pygmy seahorses, while the surrounding sand hosts pairs of mandarinfish at dusk.', 1, 0, 24, 5, 'Mixed'),
  ('Pearl Farm', 1.4598528, 125.2434203, 'Adjacent to a working pearl farm in the strait, the underwater infrastructure creates artificial reef habitats. The ropes and structures attract a rich community of frogfish, nudibranchs, and juvenile fish. The sandy bottom below is home to jawfish colonies and various gobies.', 1, 0, 20, 5, 'Mixed'),
  ('Delima Point', 1.4593809, 125.2407381, 'A promontory point with healthy hard and soft coral growth from 5 to 26 meters. The reef wall attracts schooling fusiliers and anthias, while the crevices harbor moray eels and banded coral shrimp. A great site combining reef scenery with Lembeh''s signature macro finds.', 1, 0, 26, 5, 'Coral'),
  ('Rojos', 1.4609101, 125.2377126, 'Named after a local dive guide, Rojos features a coral reef in the shallows sloping to a sandy bottom. The transition zone between reef and sand is particularly productive for macro life, including ornate ghost pipefish, robust ghost pipefish, and various species of shrimpfish.', 1, 0, 25, 6, 'Mixed'),
  ('Jarijari', 1.4703779, 125.2445446, 'A fine muck diving site with a dark sand slope covered in scattered rubble and debris. Named after the local word for ''fingers,'' referring to the finger-like coral formations. Known for Ambon scorpionfish, painted frogfish, and devil stinger sightings.', 1, 0, 20, 10, 'Sand & Rubble'),
  ('Kungkungan House Reef', 1.4714933, 125.2476774, 'The easily accessible house reef of the iconic Kungkungan Bay Resort. A rich combination of coral shallows and sand slope supporting an incredible diversity of macro subjects available for diving day and night. A Lembeh institution for underwater photographers.', 2, 150000, 22, 12, 'Mixed'),
  ('Retak Becho', 1.475287, 125.2497503, 'This crack in the reef (retak = crack) features a distinctive fissure in the coral wall at 12 meters. The surrounding area offers a mix of coral bommies and rubble, supporting a range of macro life including various frogfish, nudibranchs, and blue-ringed octopus.', 2, 150000, 26, 14, 'Mixed'),
  ('Makawide 2', 1.4785045, 125.2499005, 'The second section of the Makawide reef system, offering a steeper wall with beautiful soft coral growth and gorgonian sea fans. Below the wall, a sandy slope with rocky outcrops hosts banggai cardinalfish, leaf scorpionfish, and cuttlefish.', 2, 150000, 28, 14, 'Mixed'),
  ('Makawide 3', 1.4801562, 125.2496001, 'The most coral-rich section of the Makawide area, featuring a lush coral reef with excellent visibility. Dense hard coral gardens from 5–15 meters support a variety of reef fish including pygmy seahorses in the gorgonians, while deeper sandy areas offer classic muck finds.', 2, 150000, 28, 14, 'Coral'),
  ('Batu Mera', 1.4821029, 125.2537286, 'Named for the red-colored rocks (batu mera = red rock) at this site. Volcanic boulders encrusted with vibrant sponges and soft corals create a dramatic underwater landscape. Look for hawksbill turtles, schools of batfish, and various species of moray eels in the crevices.', 2, 150000, 25, 16, 'Mixed'),
  ('Pulau Putus', 1.4882838, 125.256107, 'This ''broken island'' (pulau putus) site features a dramatic coral wall with overhangs and swim-throughs. The exposed position at the northeast coast of Lembeh brings nutrient-rich currents, attracting large sea fans, barrel sponges, and schooling reef fish.', 2, 150000, 30, 18, 'Coral'),
  ('California Dreaming', 1.4893563, 125.2576304, 'One of Lembeh''s rare vibrant coral reef dives, featuring two rocky peaks covered in soft corals, gorgonian fans, and whip corals. Unlike typical muck sites, this location is suited for wide-angle photography with excellent visibility and colorful reef scenery.', 2, 150000, 28, 20, 'Coral'),
  ('Angel''s Window', 1.4959408, 125.2618465, 'One of Lembeh''s most iconic and photogenic dive sites. A twin-peaked coral pinnacle features a large natural archway (the ''window'') at around 22 meters. Home to pygmy seahorses on the gorgonians, leaf scorpionfish, and various shrimp species in the overhangs.', 3, 300000, 30, 22, 'Coral'),
  ('Dante''s Wall', 1.4969704, 125.2633485, 'A stunning sheer wall dive dropping to 35 meters at the northern tip of Lembeh Island. The wall is draped in magnificent black corals and large gorgonian fans. A cave in the shallows may harbor flashlight fish. This site can have significant current.', 3, 300000, 35, 23, 'Coral'),
  ('Kainah''s Treasure', 1.5007024, 125.26151, 'Named after a local diver who discovered this hidden gem, the site features a series of coral-encrusted boulders on a slope. Rich with soft corals and barrel sponges, it is a reliable spot for hawksbill turtles, barracuda, and rare nudibranchs.', 3, 300000, 28, 24, 'Coral'),
  ('Jico Yance', 1.5089877, 125.2670068, 'Located on the exposed northeastern coast of Lembeh, this site has a mix of coral reef and sand. When currents are favorable, large pelagic fish such as barracuda and trevally can be spotted, alongside the usual macro subjects in the coral rubble areas.', 3, 300000, 30, 26, 'Mixed'),
  ('Batu Kapal', 1.5231969, 125.2770809, 'A series of impressive pinnacles off the far northern tip of Lembeh. This current-rich site is the best place in Lembeh for big fish encounters including reef sharks, eagle rays, large groupers, and schools of barracuda and trevally. Vibrant soft coral growth covers the pinnacles.', 3, 300000, 35, 30, 'Coral'),
  ('Batu Kapal 2', 1.5221244, 125.2775959, 'The second set of pinnacles at Batu Kapal, slightly shallower and more sheltered. Dense soft coral gardens and sea fans attract schools of anthias and fusiliers. On the deeper sandy bottom, garden eels and sand-dwelling gobies create a unique contrast to the reef above.', 3, 300000, 32, 30, 'Coral'),
  ('Pulau Dua', 1.5288851, 125.2775336, 'A small twin island (pulau dua = two islands) off the northern tip of Lembeh. The rocky reef around the islets supports healthy hard coral growth with schools of damselfish and surgeonfish. Turtle sightings are common, and the deeper slopes offer muck diving opportunities.', 3, 300000, 25, 32, 'Mixed'),
  ('Pulau Susulina', 1.5348482, 125.2805377, 'A remote islet north of Lembeh surrounded by healthy coral reef. The exposed position brings strong nutrient-rich currents supporting large sea fans, barrel sponges, and dense coral growth. Pelagic fish including Napoleon wrasse and whitetip reef sharks patrol the outer reef.', 3, 300000, 28, 35, 'Coral'),
  ('Batu Bunyan', 1.5475221, 125.2868255, 'The most remote dive site on the northern end of the strait, featuring a large submerged rock formation with dramatic topography. Strong currents bring nutrient-rich water supporting lush coral growth, large gorgonians, and sightings of manta rays during the right season.', 3, 300000, 30, 38, 'Coral'),
  ('Tanjung Nanas', 1.5527639, 125.2935477, 'The northernmost dive point in the Lembeh area, located on a windswept headland. This underexplored site features pristine coral walls dropping sharply to sandy depths. The remote location means encounters with larger marine life including whitetip reef sharks, green turtles, and large schools of pelagic fish are possible.', 3, 300000, 28, 40, 'Coral');

-- =============================================
-- 4. VERIFY
-- =============================================
SELECT count(*) AS total_dive_sites FROM dive_sites;
