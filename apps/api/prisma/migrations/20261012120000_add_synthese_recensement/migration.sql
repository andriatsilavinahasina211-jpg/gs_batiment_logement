CREATE TABLE "SyntheseRecensement" (
    "id" TEXT NOT NULL DEFAULT 'utilisation-biens',
    "libelle" TEXT NOT NULL,
    "bureaux" INTEGER NOT NULL,
    "logements" INTEGER NOT NULL,
    "autres" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SyntheseRecensement_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SyntheseRecensement_counts_check" CHECK (
        "bureaux" >= 0
        AND "logements" >= 0
        AND "autres" >= 0
        AND "total" = "bureaux" + "logements" + "autres"
    )
);

INSERT INTO "SyntheseRecensement" (
    "libelle",
    "bureaux",
    "logements",
    "autres",
    "total",
    "source",
    "updatedAt"
)
VALUES (
    'Utilisation des biens publics',
    444,
    228,
    131,
    803,
    'Capture du tableau fournie par l''utilisateur; année non précisée',
    CURRENT_TIMESTAMP
);
