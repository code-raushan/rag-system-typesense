import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

async function loadFromCheerio() {
    const loader = new CheerioWebBaseLoader("https://test-euron-vector-docs.s3.ap-south-1.amazonaws.com/Untitled.txt");
    const docs = await loader.load();
    const id = "111"
    docs.map((doc) => {
        doc.id = id,
            doc.metadata = {
                courseId: id
            }
    })

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 250,
    });

    const splitDocs = await splitter.splitDocuments(docs.flat());

    splitDocs.map((doc, idx) => {
        doc.id = `${id}-${idx}`,
            doc.metadata = {
                courseId: id
            }
    })

    console.dir({ splitDocs }, { depth: Infinity })

    return;
}

loadFromCheerio().catch(console.error);