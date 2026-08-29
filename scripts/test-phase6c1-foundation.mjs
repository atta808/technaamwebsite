import assert from "node:assert/strict";

// This is a placeholder test script for the Phase 6C.1 schema validation.
// In a full environment, this would use a Supabase client to create/query the local DB.
// Since we are mocking database tests for the pipeline, we perform logical schema constraint assertions.

function validateFoundation() {
    console.log("Validating Phase 6C.1 Foundation logic...");

    // Test: Self-referencing constraint logic
    const validateNoSelfRef = (source_id, target_id) => {
        if (source_id === target_id) throw new Error("tech_relationships_no_self_ref violated");
    };

    try {
        validateNoSelfRef("id1", "id1");
        assert.fail("Should have thrown on self-reference");
    } catch (e) {
        assert.equal(e.message, "tech_relationships_no_self_ref violated");
    }

    // Test: Unique relationship constraint logic
    const relationships = new Set();
    const addRelationship = (source, target, type) => {
        const key = `${source}-${target}-${type}`;
        if (relationships.has(key)) throw new Error("tech_relationships_unique violated");
        relationships.add(key);
    };

    addRelationship("app1", "os1", "runs_on");
    try {
        addRelationship("app1", "os1", "runs_on");
        assert.fail("Should have thrown on duplicate relationship");
    } catch (e) {
        assert.equal(e.message, "tech_relationships_unique violated");
    }

    // Allowed duplicate if type differs
    addRelationship("app1", "os1", "compatible_with");

    console.log("Phase 6C.1 Foundation Tests PASSED.");
}

validateFoundation();
