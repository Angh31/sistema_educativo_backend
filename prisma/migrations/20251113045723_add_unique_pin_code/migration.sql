/*
  Warnings:

  - A unique constraint covering the columns `[pin_code]` on the table `students` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "students_pin_code_key" ON "students"("pin_code");
