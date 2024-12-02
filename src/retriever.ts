import { typesense } from ".";

export async function retrieveCourses() {
    const result = await typesense.collections<{ id: string, title: string, subtitle: string, description: string }>("course").documents().search({
        q: "aws",
        query_by: "title,subtitle,description",
    });
    console.dir(result?.hits?.[0]?.document.id, { depth: Infinity });
}

retrieveCourses();