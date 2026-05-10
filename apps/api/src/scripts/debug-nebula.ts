
import { AstTransformer } from '@repo/nebula';

const code = `
import React from 'react';
export const MyComponent = () => {
    return (
        <div className="p-4 bg-red-500">
            <h1>Hello World</h1>
        </div>
    );
};
`;

try {
    console.log("Starting parse test...");
    const transformer = new AstTransformer();
    const tree = transformer.parse(code);
    console.log("Parse successful!");
    console.log(JSON.stringify(tree, null, 2));
} catch (error) {
    console.error("Parse failed:", error);
}
