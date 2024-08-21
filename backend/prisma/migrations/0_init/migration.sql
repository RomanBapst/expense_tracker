-- CreateTable
CREATE TABLE "employee" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "surname" VARCHAR(128) NOT NULL,
    "salary" REAL NOT NULL,

    CONSTRAINT "employee_pkey" PRIMARY KEY ("id")
);

