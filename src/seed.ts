import { FieldType } from "typesense/lib/Typesense/Collection";
import { typesense } from ".";


// Define the schema for the 'course' collection
const schema = {
    name: "course",
    fields: [
        { name: "id", type: "string" as FieldType },
        { name: "title", type: "string" as FieldType },
        { name: "subtitle", type: "string" as FieldType },
        { name: "description", type: "string" as FieldType },
        { name: "slug", type: "string" as FieldType },
        { name: "startDate", type: "string" as FieldType },
        { name: "timing", type: "string" as FieldType }
    ],
};

async function createCourseCollection() {
    try {
        // Start of Selection
        await typesense.collections().create(schema);
        console.log("Collection 'course' created successfully.");
    } catch (error: unknown) {
        if (error instanceof Error && error.message.includes("already exists")) {
            console.log("Collection 'course' already exists.");
        } else {
            console.error("Error creating collection:", error);
        }
    }
}

function generateDummyCourses(count: number) {
    const courses = [];
    const topics = ["Python", "Data Science", "Data Engineering", "Full Stack", "Frontend", "Backend", "JavaScript", "Go", "AWS"];
    for (let i = 1; i <= count; i++) {
        const topic = topics[Math.floor(Math.random() * topics.length)];
        courses.push({
            id: `course_${i}`,
            title: `${topic} Course ${i}`,
            subtitle: `An in-depth ${topic} course`,
            description: `This course covers ${topic} topics in detail, including practical applications and hands-on projects.`,
            slug: `${topic.toLowerCase()}-course-${i}`,
            startDate: new Date(Date.now() + i * 86400000).toISOString(), // Start dates staggered by days
            timing: `${Math.floor(Math.random() * 4) + 1} hours per week`
            // Add other fields here if necessary
        });
    }
    return courses;
}

async function importDummyCourses() {
    const courses = generateDummyCourses(500);
    try {
        const importResult = await typesense.collections("course").documents().import(courses, { action: "create" });
        console.log("Dummy courses imported successfully.");
    } catch (error) {
        console.error("Error importing dummy courses:", error);
    }
}

async function main() {
    await createCourseCollection();
    await importDummyCourses();
}

main(); 