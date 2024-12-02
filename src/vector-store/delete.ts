import { typesense } from "..";
// Start of Selection

async function deleteCollection() {
    await typesense.collections('course').delete();
}

deleteCollection();
