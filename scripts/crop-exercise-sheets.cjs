const expectedDimensions = { width: 1536, height: 1024 };

const sheets = {
  infographic: "Comprehensive Fitness Exercise Infographic-1.png",
  poster: "Complete Fitness Exercise Reference Poster-2.png",
  anatomy: "Comprehensive Fitness Exercise Anatomy Chart-3.png",
};

const crops = [];

function addRow(sheet, xEdges, top, bottom, entries) {
  if (xEdges.length !== entries.length + 1) {
    throw new Error(`Expected ${entries.length} crop columns for ${sheet}`);
  }

  entries.forEach((entry, index) => {
    const left = xEdges[index] + 2;
    const right = xEdges[index + 1] - 2;
    crops.push({
      ...entry,
      sheet,
      rect: {
        left,
        top,
        width: right - left,
        height: bottom - top,
      },
    });
  });
}

function addGrid(sheet, xEdges, rows) {
  for (const row of rows) {
    addRow(sheet, xEdges, row.top, row.bottom, row.entries);
  }
}

const infographicX = [6, 411, 778, 1177, 1530];
addGrid("infographic", infographicX, [
  {
    top: 39,
    bottom: 248,
    entries: [
      { exercise: "Barbell Bench Press", output: "bench-press.png" },
      { exercise: "Incline Dumbbell Press", output: "incline-db.png" },
      { exercise: "Machine Chest Press", output: "chest-press-machine.png" },
      { exercise: "Pec Deck", output: "pec-deck.png" },
    ],
  },
  {
    top: 293,
    bottom: 493,
    entries: [
      { exercise: "Cable Fly", output: "cable-fly.png" },
      { exercise: "Chest Dips", output: "chest-dips.png" },
      { exercise: "Push-Up", output: "push-ups.png" },
      { exercise: "Decline Bench Press", output: "decline-bench-press.png" },
    ],
  },
  {
    top: 537,
    bottom: 738,
    entries: [
      {
        exercise: "Lat Pulldown",
        output: "lat-pulldown-demo.png",
        status: "preserve-existing",
        catalogPath: "/exercises/lat-pulldown-demo.png",
        note: "Do not crop or overwrite the existing catalog image.",
      },
      { exercise: "Seated Cable Row", output: "seated-row.png" },
      { exercise: "Hammer Strength Row", output: "hammer-row.png" },
      { exercise: "Single Arm Dumbbell Row", output: "single-arm-row.png" },
    ],
  },
  {
    top: 783,
    bottom: 1012,
    entries: [
      { exercise: "Assisted Pull-Up", output: "assisted-pullup.png" },
      { exercise: "Face Pull", output: "face-pull.png" },
      { exercise: "Straight Arm Pulldown", output: "straight-arm-pulldown.png" },
      { exercise: "Back Extension", output: "back-extension.png" },
    ],
  },
]);

const posterLegsX = [6, 205, 388, 579, 764];
addGrid("poster", posterLegsX, [
  {
    top: 357,
    bottom: 462,
    entries: [
      { exercise: "Leg Press", output: "leg-press.png" },
      { exercise: "Goblet Squat", output: "goblet-squat.png" },
      { exercise: "Leg Extension", output: "leg-extension.png" },
      { exercise: "Seated Leg Curl", output: "seated-leg-curl.png" },
    ],
  },
  {
    top: 489,
    bottom: 605,
    entries: [
      { exercise: "Lying Leg Curl", output: "lying-leg-curl.png" },
      { exercise: "Bulgarian Split Squat", output: "bulgarian-split-squat.png" },
      { exercise: "Romanian Deadlift", output: "romanian-deadlift.png" },
      { exercise: "Standing Calf Raise", output: "standing-calf-raise.png" },
    ],
  },
]);

const posterShouldersX = [772, 962, 1153, 1344, 1530];
addGrid("poster", posterShouldersX, [
  {
    top: 357,
    bottom: 462,
    entries: [
      {
        exercise: "Seated Dumbbell Shoulder Press",
        output: "dumbbell-shoulder-press.png",
      },
      { exercise: "Machine Shoulder Press", output: "machine-shoulder-press.png" },
      { exercise: "Dumbbell Lateral Raise", output: "lateral-raise.png" },
      { exercise: "Cable Lateral Raise", output: "cable-lateral-raise.png" },
    ],
  },
  {
    top: 489,
    bottom: 605,
    entries: [
      { exercise: "Rear Delt Fly", output: "rear-delt-fly.png" },
      { exercise: "Reverse Pec Deck", output: "reverse-pec-deck.png" },
      { exercise: "Dumbbell Front Raise", output: "front-raise.png" },
      {
        exercise: "Face Pull",
        output: "face-pull.png",
        status: "shared-path",
        note: "Reuses the Back Face Pull image at the same catalog path.",
      },
    ],
  },
]);

const posterBicepsX = [6, 115, 239, 363, 487, 611, 750];
addRow("poster", posterBicepsX, 657, 788, [
  { exercise: "Barbell Curl", output: "barbell-curl.png" },
  { exercise: "Dumbbell Bicep Curl", output: "dumbbell-curl.png" },
  { exercise: "Hammer Curl", output: "hammer-curl.png" },
  { exercise: "Incline Dumbbell Curl", output: "incline-curl.png" },
  { exercise: "Preacher Curl", output: "preacher-curl.png" },
  { exercise: "Cable Bicep Curl", output: "cable-bicep-curl.png" },
]);

const posterTricepsX = [757, 885, 1012, 1140, 1268, 1397, 1530];
addRow("poster", posterTricepsX, 657, 788, [
  { exercise: "Rope Tricep Pushdown", output: "rope-pushdown.png" },
  {
    exercise: "Overhead Dumbbell Tricep Extension",
    output: "overhead-tricep.png",
  },
  { exercise: "Skull Crusher", output: "skull-crusher.png" },
  { exercise: "Close Grip Bench Press", output: "close-grip-bench.png" },
  { exercise: "Tricep Dips", output: "tricep-dips.png" },
  { exercise: "Single Arm Cable Pushdown", output: "single-arm-pushdown.png" },
]);

const posterForearmsX = [6, 102, 191, 286, 394, 483];
addRow("poster", posterForearmsX, 841, 1017, [
  { exercise: "Wrist Curl", output: "wrist-curl.png" },
  { exercise: "Reverse Wrist Curl", output: "reverse-wrist-curl.png" },
  { exercise: "Farmer's Carry", output: "farmers-carry.png" },
  { exercise: "Reverse Barbell Curl", output: "reverse-barbell-curl.png" },
  { exercise: "Dead Hang", output: "dead-hang.png" },
]);

const anatomyAbsX = [1037, 1160, 1284, 1407, 1530];
addGrid("anatomy", anatomyAbsX, [
  {
    top: 650,
    bottom: 750,
    entries: [
      { exercise: "Crunch", output: "crunch.png" },
      { exercise: "Plank", output: "plank.png" },
      { exercise: "Dead Bug", output: "dead-bug.png" },
      { exercise: "Hanging Knee Raise", output: "hanging-knee-raise.png" },
    ],
  },
  {
    top: 773,
    bottom: 876,
    entries: [
      { exercise: "Reverse Crunch", output: "reverse-crunch.png" },
      { exercise: "Bicycle Crunch", output: "bicycle-crunch.png" },
      { exercise: "Russian Twist", output: "russian-twist.png" },
      { exercise: "Bird Dog", output: "bird-dog.png" },
    ],
  },
]);

const anatomyCardioX = [6, 197, 389, 580, 772, 963, 1153, 1344, 1530];
addRow("anatomy", anatomyCardioX, 918, 1018, [
  {
    exercise: "Treadmill Walking",
    output: null,
    catalogPath: null,
    status: "manual-review",
    note: 'Catalog image path is the placeholder "..."; choose the catalog URL and matching filename before cropping.',
  },
  { exercise: "Treadmill Jogging", output: "treadmill.png" },
  { exercise: "Stationary Cycling", output: "cycling.png" },
  { exercise: "Elliptical", output: "elliptical.png" },
  { exercise: "Rowing Machine", output: "rowing-machine.png" },
  { exercise: "Stair Climber", output: "stair-climber.png" },
  { exercise: "Jumping Jacks", output: "jumping-jacks.png" },
  { exercise: "Outdoor Jogging", output: "outdoor-jogging.png" },
]);

function printPlan() {
  let ready = 0;
  let review = 0;
  let preserved = 0;
  let shared = 0;

  console.log("Exercise crop plan (coordinates are left, top, width, height):");
  for (const crop of crops) {
    const rect = `${crop.rect.left}, ${crop.rect.top}, ${crop.rect.width}, ${crop.rect.height}`;
    const catalogPath = crop.output
      ? crop.catalogPath ?? `/images/${crop.output}`
      : "(catalog filename unresolved)";
    const filesystemPath = catalogPath.startsWith("/")
      ? `public${catalogPath}`
      : catalogPath;
    const status = crop.status ?? "ready";
    console.log(
      `- ${crop.exercise}: ${filesystemPath} (${catalogPath}) | ${crop.sheet} | (${rect}) | ${status}`,
    );
    if (crop.note) console.log(`  Review: ${crop.note}`);

    if (status === "ready") ready += 1;
    else if (status === "manual-review") review += 1;
    else if (status === "preserve-existing") preserved += 1;
    else if (status === "shared-path") shared += 1;
  }
  console.log(
    `Summary: ${ready} crop outputs, ${review} manual-review panels, ` +
      `${shared} shared-path aliases, ${preserved} preserved existing image.`,
  );
}

async function validateSources(sharp, path, outputDirectory) {
  for (const [key, filename] of Object.entries(sheets)) {
    const sourcePath = path.join(outputDirectory, "source-sheets", filename);
    const metadata = await sharp(sourcePath).metadata();
    if (
      metadata.format !== "png" ||
      metadata.width !== expectedDimensions.width ||
      metadata.height !== expectedDimensions.height
    ) {
      throw new Error(
        `Unexpected source image format or dimensions for ${filename}: ` +
          `${metadata.format} ${metadata.width}x${metadata.height}`,
      );
    }
    sheets[key] = sourcePath;
  }
}

async function run() {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default;
  const root = path.resolve(__dirname, "..");
  const outputDirectory = path.join(root, "public", "exercises");

  printPlan();
  await validateSources(sharp, path, outputDirectory);

  for (const crop of crops) {
    const { left, top, width, height } = crop.rect;
    if (
      left < 0 ||
      top < 0 ||
      width <= 0 ||
      height <= 0 ||
      left + width > expectedDimensions.width ||
      top + height > expectedDimensions.height
    ) {
      throw new Error(`Crop rectangle is outside the source sheet for ${crop.exercise}`);
    }
  }

  const outputs = new Set();
  const destinations = [];
  for (const crop of crops) {
    if (
      crop.status === "manual-review" ||
      crop.status === "preserve-existing" ||
      crop.status === "shared-path"
    ) {
      continue;
    }
    if (!crop.output) throw new Error(`Missing output filename for ${crop.exercise}`);
    const catalogPath = crop.catalogPath ?? `/images/${crop.output}`;
    if (!catalogPath.startsWith("/images/") && catalogPath !== "/exercises/lat-pulldown-demo.png") {
      throw new Error(`Unexpected catalog image path for ${crop.exercise}: ${catalogPath}`);
    }
    if (catalogPath === "/exercises/lat-pulldown-demo.png") {
      throw new Error("Refusing to overwrite public/exercises/lat-pulldown-demo.png");
    }
    if (outputs.has(catalogPath)) {
      throw new Error(`Duplicate crop output catalog path: ${catalogPath}`);
    }
    outputs.add(catalogPath);
  }

  for (const crop of crops) {
    if (
      crop.status === "manual-review" ||
      crop.status === "preserve-existing" ||
      crop.status === "shared-path"
    ) {
      continue;
    }
    const catalogPath = crop.catalogPath ?? `/images/${crop.output}`;
    const destination = path.join(root, "public", catalogPath.slice(1));
    if (fs.existsSync(destination)) {
      throw new Error(`Refusing to overwrite existing output: ${destination}`);
    }
    destinations.push({ crop, destination });
  }

  for (const { crop, destination } of destinations) {
    await fs.promises.mkdir(path.dirname(destination), { recursive: true });
    const { left, top, width, height } = crop.rect;
    await sharp(sheets[crop.sheet])
      .extract({ left, top, width, height })
      .png()
      .toFile(destination);
  }
}

run().catch((error) => {
  console.error("Exercise-sheet cropping failed:", error);
  process.exitCode = 1;
});
