import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
import { FieldType } from "typesense/lib/Typesense/Collection";
import { typesense } from "..";

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
        { name: "timing", type: "string" as FieldType },
        { name: "text", type: "string" as FieldType }, // Combined text for embeddings
        { name: "vec", type: "float[]" as FieldType, num_dimensions: 384 }, // Embedding vectors
    ],
};

async function createCourseCollection() {
    try {
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

async function generateDummyCourses(count: number) {
    const courses = [];
    const topics = ["Python", "Data Science", "Data Engineering", "Full Stack", "Frontend", "Backend", "JavaScript", "Go", "AWS"];
    const embeddings = new HuggingFaceTransformersEmbeddings({
        model: "Xenova/all-MiniLM-L6-v2",
    });

    for (let i = 1; i <= count; i++) {
        const topic = topics[Math.floor(Math.random() * topics.length)];
        const title = `${topic} Course ${i}`;
        const subtitle = `An in-depth ${topic} course`;
        const description = `This course covers ${topic} topics in detail, including practical applications and hands-on projects.`;
        const text = `${title} ${subtitle} ${description}`; // Combined text for embedding
        const vec = await embeddings.embedQuery(text); // Generate embedding

        courses.push({
            id: `course_${i}`,
            title,
            subtitle,
            description,
            slug: `${topic.toLowerCase()}-course-${i}`,
            startDate: new Date(Date.now() + i * 86400000).toISOString(), // Staggered start dates
            timing: `${Math.floor(Math.random() * 4) + 1} hours per week`,
            text, // Combined text field
            vec,  // Embedding vector
        });
    }
    return courses;
}

async function importDummyCourses() {
    const courses = await generateDummyCourses(500);
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