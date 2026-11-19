import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseGpxContent,
  parseTcxContent,
  parseActivityFileContent,
} from "./activity-file-parser";

describe("Phase 15 - Real Activity File Parser (.GPX, .TCX, .JSON, .CSV)", () => {
  test("Faz parse de arquivo GPX extraindo distância GPS (Haversine), duração, FC média e RPE", () => {
    const sampleGpx = `<?xml version="1.0" encoding="UTF-8"?>
      <gpx version="1.1" creator="StravaGPX">
        <trk>
          <name>Corrida Matinal na Orla</name>
          <type>running</type>
          <trkseg>
            <trkpt lat="-22.9840" lon="-43.2040">
              <time>2026-11-18T10:00:00Z</time>
              <extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>156</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions>
            </trkpt>
            <trkpt lat="-22.9840" lon="-43.1750">
              <time>2026-11-18T10:32:00Z</time>
              <extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>168</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions>
            </trkpt>
          </trkseg>
        </trk>
      </gpx>`;

    const parsed = parseGpxContent(sampleGpx);
    assert.ok(parsed);
    assert.equal(parsed?.title, "Corrida Matinal na Orla");
    assert.equal(parsed?.modalityCode, "running");
    assert.equal(parsed?.durationMinutes, 32);
    assert.equal(parsed?.localDate, "2026-11-18");
    assert.ok((parsed?.distanceKm || 0) > 2.5);
    assert.equal(parsed?.avgHeartRateBpm, 162);
    assert.equal(parsed?.estimatedRpe, 8);
  });

  test("Faz parse de arquivo Garmin TCX e JSON/CSV", () => {
    const sampleTcx = `<?xml version="1.0" encoding="UTF-8"?>
      <TrainingCenterDatabase>
        <Activities>
          <Activity Sport="Biking">
            <Id>2026-11-17T09:00:00Z</Id>
            <Lap StartTime="2026-11-17T09:00:00Z">
              <TotalTimeSeconds>3600</TotalTimeSeconds>
              <DistanceMeters>24500</DistanceMeters>
              <AverageHeartRateBpm><Value>145</Value></AverageHeartRateBpm>
              <Notes>Pedal de Endurance</Notes>
            </Lap>
          </Activity>
        </Activities>
      </TrainingCenterDatabase>`;

    const tcx = parseTcxContent(sampleTcx);
    assert.ok(tcx);
    assert.equal(tcx?.modalityCode, "cycling");
    assert.equal(tcx?.durationMinutes, 60);
    assert.equal(tcx?.distanceKm, 24.5);

    const csvList = parseActivityFileContent(
      `Data,Treino,Modalidade,DuracaoMin,RPE\n18/11/2026,"Vôlei de Praia Dupla",beach_volleyball,75,8`,
      "historico.csv"
    );
    assert.equal(csvList.length, 1);
    assert.equal(csvList[0].modalityCode, "beach_volleyball");
    assert.equal(csvList[0].durationMinutes, 75);
    assert.equal(csvList[0].estimatedRpe, 8);
  });
});
