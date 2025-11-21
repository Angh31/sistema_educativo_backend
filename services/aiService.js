// ====================================
// SERVICIO DE IA - PREDICCIONES
// ====================================

const axios = require("axios");

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || "AIzaSyAYGX2JDmQyVOE-CPcJgw71ByBgzjisUyI";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

/**
 * Predice riesgo académico de un estudiante
 */
async function predictStudentRisk(studentData) {
  const prompt = `
Eres un experto en análisis educativo. Analiza el siguiente estudiante:

DATOS DEL ESTUDIANTE:
- Nombre: ${studentData.name} ${studentData.last_name}
- Promedio actual: ${studentData.average || 0}
- Tasa de asistencia: ${studentData.attendance_rate || 0}%
- Cursos inscritos: ${studentData.courses_count || 0}
- Últimas calificaciones: ${JSON.stringify(studentData.recent_grades || [])}

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin backticks) en este formato:
{
  "risk_level": "LOW|MEDIUM|HIGH",
  "probability": 0-100,
  "risk_factors": ["factor1", "factor2"],
  "recommendations": ["recomendación1", "recomendación2"],
  "summary": "Resumen breve de 50 palabras"
}

IMPORTANTE: 
- LOW = Promedio >70 y asistencia >85%
- MEDIUM = Promedio 60-70 o asistencia 75-85%
- HIGH = Promedio <60 o asistencia <75%
`;

  try {
    const response = await axios.post(
      GEMINI_URL,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        params: { key: GEMINI_API_KEY },
        timeout: 10000,
      }
    );

    const text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // Limpiar markdown si existe
    const cleanText = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Error en predicción:", error.message);

    // Fallback: predicción basada en reglas simples
    const avg = studentData.average || 0;
    const att = studentData.attendance_rate || 0;

    let risk_level = "LOW";
    let probability = 10;

    if (avg < 60 || att < 75) {
      risk_level = "HIGH";
      probability = 75;
    } else if (avg < 70 || att < 85) {
      risk_level = "MEDIUM";
      probability = 45;
    }

    return {
      risk_level,
      probability,
      risk_factors: avg < 70 ? ["Promedio bajo"] : ["Asistencia irregular"],
      recommendations: ["Mejorar asistencia", "Reforzar estudio"],
      summary: `Estudiante con riesgo ${risk_level.toLowerCase()}.`,
    };
  }
}

/**
 * Analiza rendimiento de un curso
 */
async function analyzeCoursePerformance(courseData) {
  const prompt = `
Eres un experto en análisis educativo. Analiza el siguiente curso:

DATOS DEL CURSO:
- Nombre: ${courseData.name}
- Promedio general: ${courseData.average || 0}
- Total estudiantes: ${courseData.students_count || 0}
- Estudiantes con riesgo: ${courseData.at_risk_count || 0}
- Tasa de aprobación: ${courseData.pass_rate || 0}%

Responde ÚNICAMENTE con un JSON válido (sin markdown) en este formato:
{
  "status": "EXCELLENT|GOOD|AVERAGE|POOR",
  "insights": ["insight1", "insight2"],
  "recommendations": ["recomendación1", "recomendación2"],
  "summary": "Resumen de 40 palabras"
}
`;

  try {
    const response = await axios.post(
      GEMINI_URL,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        params: { key: GEMINI_API_KEY },
        timeout: 10000,
      }
    );

    const text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const cleanText = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Error en análisis de curso:", error.message);
    return {
      status: "AVERAGE",
      insights: ["Datos insuficientes"],
      recommendations: ["Recopilar más información"],
      summary: "Análisis no disponible temporalmente.",
    };
  }
}

module.exports = {
  predictStudentRisk,
  analyzeCoursePerformance,
};
