# 📚 DOCUMENTACIÓN API - SISTEMA ACADÉMICO

## 🔐 AUTENTICACIÓN

### Register

**POST** `/api/auth/register`

```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "STUDENT|TEACHER|PARENT|ADMIN",
  "name": "Juan",
  "last_name": "Pérez",
  // Campos adicionales según el rol
  "birth_date": "2010-05-15", // Para STUDENT
  "gender": "M", // Para STUDENT
  "specialty": "Matemáticas", // Para TEACHER
  "phone": "1234-5678"
}
```

### Login

**POST** `/api/auth/login`

```json
{
  "email": "admin@escuela.com",
  "password": "123456"
}
```

### Get Me

**GET** `/api/auth/me`
Headers: `Authorization: Bearer TOKEN`

---

## 👨‍🎓 ESTUDIANTES

### Listar todos

**GET** `/api/students`
Headers: `Authorization: Bearer TOKEN` (Admin/Teacher)

### Obtener por ID

**GET** `/api/students/:id`
Headers: `Authorization: Bearer TOKEN`

### Actualizar

**PUT** `/api/students/:id`
Headers: `Authorization: Bearer TOKEN` (Admin)

```json
{
  "name": "Luis",
  "last_name": "García",
  "phone": "1234-5678",
  "address": "Nueva dirección"
}
```

### Eliminar

**DELETE** `/api/students/:id`
Headers: `Authorization: Bearer TOKEN` (Admin)

### Obtener QR/PIN

**GET** `/api/students/:id/credentials`
Headers: `Authorization: Bearer TOKEN`

---

## 👨‍🏫 DOCENTES

### Listar todos

**GET** `/api/teachers`
Headers: `Authorization: Bearer TOKEN` (Admin)

### Obtener por ID

**GET** `/api/teachers/:id`
Headers: `Authorization: Bearer TOKEN`

### Actualizar

**PUT** `/api/teachers/:id`
Headers: `Authorization: Bearer TOKEN` (Admin)

### Eliminar

**DELETE** `/api/teachers/:id`
Headers: `Authorization: Bearer TOKEN` (Admin)

---

## 📚 CURSOS

### Listar todos

**GET** `/api/courses`
Headers: `Authorization: Bearer TOKEN`

### Obtener por ID

**GET** `/api/courses/:id`
Headers: `Authorization: Bearer TOKEN`

### Crear

**POST** `/api/courses`
Headers: `Authorization: Bearer TOKEN` (Admin)

```json
{
  "name": "Matemáticas I",
  "description": "Álgebra básica",
  "teacher_id": "uuid",
  "grade_level": 1
}
```

### Actualizar

**PUT** `/api/courses/:id`
Headers: `Authorization: Bearer TOKEN` (Admin)

### Eliminar

**DELETE** `/api/courses/:id`
Headers: `Authorization: Bearer TOKEN` (Admin)

---

## 📅 HORARIOS

### Listar todos

**GET** `/api/schedules`
Headers: `Authorization: Bearer TOKEN`

### Por curso

**GET** `/api/schedules/course/:courseId`
Headers: `Authorization: Bearer TOKEN`

### Por estudiante

**GET** `/api/schedules/student/:studentId`
Headers: `Authorization: Bearer TOKEN`

### Crear

**POST** `/api/schedules`
Headers: `Authorization: Bearer TOKEN` (Admin)

```json
{
  "course_id": "uuid",
  "day_week": "Lunes",
  "start_time": "08:00",
  "end_time": "09:00",
  "classroom": "Aula 1"
}
```

### Actualizar

**PUT** `/api/schedules/:id`
Headers: `Authorization: Bearer TOKEN` (Admin)

### Eliminar

**DELETE** `/api/schedules/:id`
Headers: `Authorization: Bearer TOKEN` (Admin)

---

## 📝 INSCRIPCIONES

### Listar todas

**GET** `/api/enrollments`
Headers: `Authorization: Bearer TOKEN` (Admin)

### Por estudiante

**GET** `/api/enrollments/student/:studentId`
Headers: `Authorization: Bearer TOKEN`

### Por curso

**GET** `/api/enrollments/course/:courseId`
Headers: `Authorization: Bearer TOKEN` (Admin/Teacher)

### Inscribir

**POST** `/api/enrollments`
Headers: `Authorization: Bearer TOKEN` (Admin)

```json
{
  "student_id": "uuid",
  "course_id": "uuid"
}
```

### Inscripción masiva

**POST** `/api/enrollments/bulk`
Headers: `Authorization: Bearer TOKEN` (Admin)

```json
{
  "student_ids": ["uuid1", "uuid2", "uuid3"],
  "course_id": "uuid"
}
```

### Eliminar

**DELETE** `/api/enrollments/:id`
Headers: `Authorization: Bearer TOKEN` (Admin)

---

## ✅ ASISTENCIA

### Listar

**GET** `/api/attendance?course_id=uuid&date=2024-01-15`
Headers: `Authorization: Bearer TOKEN` (Admin/Teacher)

### Por estudiante

**GET** `/api/attendance/student/:studentId`
Headers: `Authorization: Bearer TOKEN`

### Estadísticas

**GET** `/api/attendance/stats/:studentId`
Headers: `Authorization: Bearer TOKEN`

### Registrar manual

**POST** `/api/attendance/manual`
Headers: `Authorization: Bearer TOKEN` (Teacher/Admin)

```json
{
  "student_id": "uuid",
  "course_id": "uuid",
  "date": "2024-01-15",
  "status": "PRESENT|ABSENT|LATE|EXCUSED"
}
```

### Registrar por QR

**POST** `/api/attendance/qr`

```json
{
  "qr_code": "QR-123456",
  "course_id": "uuid"
}
```

### Registrar por PIN

**POST** `/api/attendance/pin`

```json
{
  "pin_code": "123456",
  "course_id": "uuid"
}
```

### Asistencia masiva

**POST** `/api/attendance/bulk`
Headers: `Authorization: Bearer TOKEN` (Teacher/Admin)

```json
{
  "course_id": "uuid",
  "date": "2024-01-15",
  "attendanceList": [
    { "student_id": "uuid1", "status": "PRESENT" },
    { "student_id": "uuid2", "status": "ABSENT" }
  ]
}
```

---

## 📊 CALIFICACIONES

### Listar

**GET** `/api/grades?course_id=uuid&student_id=uuid&period=Primer Parcial`
Headers: `Authorization: Bearer TOKEN` (Admin/Teacher)

### Por estudiante

**GET** `/api/grades/student/:studentId`
Headers: `Authorization: Bearer TOKEN`

### Por curso

**GET** `/api/grades/course/:courseId?period=Primer Parcial`
Headers: `Authorization: Bearer TOKEN` (Admin/Teacher)

### Promedio estudiante

**GET** `/api/grades/average/student/:studentId?period=Primer Parcial`
Headers: `Authorization: Bearer TOKEN`

### Promedio curso

**GET** `/api/grades/average/course/:courseId?period=Primer Parcial`
Headers: `Authorization: Bearer TOKEN` (Admin/Teacher)

### Boleta

**GET** `/api/grades/report/:studentId?period=Primer Parcial`
Headers: `Authorization: Bearer TOKEN`

### Crear/Actualizar

**POST** `/api/grades`
Headers: `Authorization: Bearer TOKEN` (Teacher/Admin)

```json
{
  "student_id": "uuid",
  "course_id": "uuid",
  "grade": 85,
  "period": "Primer Parcial",
  "comment": "Excelente trabajo"
}
```

### Actualizar

**PUT** `/api/grades/:id`
Headers: `Authorization: Bearer TOKEN` (Teacher/Admin)

### Eliminar

**DELETE** `/api/grades/:id`
Headers: `Authorization: Bearer TOKEN` (Admin)

### Calificaciones masivas

**POST** `/api/grades/bulk`
Headers: `Authorization: Bearer TOKEN` (Teacher/Admin)

```json
{
  "course_id": "uuid",
  "period": "Primer Parcial",
  "grades": [
    { "student_id": "uuid1", "grade": 85, "comment": "Excelente" },
    { "student_id": "uuid2", "grade": 75, "comment": "Bueno" }
  ]
}
```

---

## 👪 PADRES

### Listar todos

**GET** `/api/parents`
Headers: `Authorization: Bearer TOKEN` (Admin)

### Obtener por ID

**GET** `/api/parents/:id`
Headers: `Authorization: Bearer TOKEN`

### Resumen de hijos

**GET** `/api/parents/:id/children-summary`
Headers: `Authorization: Bearer TOKEN`

### Actualizar

**PUT** `/api/parents/:id`
Headers: `Authorization: Bearer TOKEN` (Admin)

### Eliminar

**DELETE** `/api/parents/:id`
Headers: `Authorization: Bearer TOKEN` (Admin)

---

## 📊 DASHBOARDS

### Admin

**GET** `/api/dashboard/admin`
Headers: `Authorization: Bearer TOKEN` (Admin)

### Teacher

**GET** `/api/dashboard/teacher/:teacherId`
Headers: `Authorization: Bearer TOKEN` (Teacher)

### Student

**GET** `/api/dashboard/student/:studentId`
Headers: `Authorization: Bearer TOKEN`

---

## 📌 NOTAS IMPORTANTES

- Todos los endpoints protegidos requieren el header: `Authorization: Bearer TOKEN`
- Los roles controlan el acceso: ADMIN > TEACHER > STUDENT/PARENT
- Las fechas deben estar en formato ISO: `2024-01-15`
- Los UUIDs deben ser válidos
- Las calificaciones van de 0 a 100
