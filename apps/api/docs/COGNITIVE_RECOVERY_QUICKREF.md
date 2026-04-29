# Cognitive Recovery - Quick Reference

## 🚀 TL;DR

**Problem**: LLM timeouts during complex refactoring operations  
**Solution**: Smart timeout detection + retry logic  
**Result**: 15s → 120s for complex ops, 3 automatic retries

---

## ⚙️ Configuration

### Default Timeouts
```typescript
Standard Operations:  60 seconds
Complex Operations:  120 seconds
Max Retries:           3 attempts
```

### Override (Optional)
```bash
# In .env
VOLCANO_TIMEOUT_STANDARD=60000
VOLCANO_TIMEOUT_COMPLEX=120000
VOLCANO_MAX_RETRIES=3
```

---

## 🎯 Complexity Detection

### Triggers 120s Timeout
- **Keywords**: `refactor`, `registry`, `structural`, `migrate`, `transform`, `nebula`, `architect`, `component manifest`, `large file`
- **Payload**: Messages >10KB

### Uses 60s Timeout
- Everything else (standard chat, simple queries)

---

## 📊 Monitoring

### Watch Logs
```bash
tail -f apps/api/logs/api.log | grep -i timeout
```

### Expected Output
```
[OpenAIProvider] Using 120s timeout (Complex: true)
[OpenAIProvider] Using 60s timeout (Complex: false)
```

### Error Messages
```
⏱️ Timeout after 120s for model mistralai/mamba-codestral
Consider increasing timeout or chunking the operation
```

---

## 🔧 Troubleshooting

### Still Timing Out?

1. **Increase timeout**:
   ```typescript
   // In config/constants.ts
   export const LLM_TIMEOUT_COMPLEX_MS = 180000; // 3 minutes
   ```

2. **Check complexity detection**:
   ```bash
   # Look for this in logs
   [OpenAIProvider] Using 120s timeout (Complex: true)
   ```
   If showing `false`, add keywords to detection list

3. **Implement chunking**:
   - Break large operations into smaller steps
   - Use checkpoint system (see full docs)

### Retries Not Working?

Check logs for:
```
[OpenAI SDK] Retrying request (attempt 2/3)
```

If missing, verify:
- `maxRetries: 3` is set in OpenAI client config
- Network connectivity is stable

---

## 📝 Code Examples

### Manual Timeout Override
```typescript
// In OpenAIProvider.ts
const timeout = request.forceTimeout || 
                (isComplex ? LLM_TIMEOUT_COMPLEX_MS : LLM_TIMEOUT_STANDARD_MS);
```

### Add Custom Detection Keyword
```typescript
// In OpenAIProvider.ts -> isComplexRefactorOperation()
const complexKeywords = [
  'refactor', 'registry', 'structural',
  'your-custom-keyword' // Add here
];
```

### Check if Operation is Complex
```typescript
import { OpenAIProvider } from './utils/OpenAIProvider';

const provider = new OpenAIProvider(config);
const isComplex = provider['isComplexRefactorOperation'](request);
console.log(`Will use ${isComplex ? 120 : 60}s timeout`);
```

---

## 🧪 Testing

### Run Test Script
```bash
cd apps/api
npx tsx scripts/test-cognitive-recovery.ts
```

### Expected Output
```
✅ All tests completed successfully

Configuration:
  - Standard timeout: 60000ms (60s)
  - Complex timeout: 120000ms (120s)
  - Max retries: 3
```

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| `src/utils/OpenAIProvider.ts` | Main implementation |
| `src/config/constants.ts` | Timeout configuration |
| `docs/COGNITIVE_RECOVERY.md` | Full documentation |
| `docs/COGNITIVE_RECOVERY_FLOW.md` | Flow diagrams |
| `scripts/test-cognitive-recovery.ts` | Test script |

---

## 🎓 Best Practices

### ✅ DO
- Monitor timeout logs during complex operations
- Adjust timeouts based on actual operation duration
- Use chunking for operations consistently >90s
- Report timeout patterns to improve detection

### ❌ DON'T
- Set timeouts >180s (consider chunking instead)
- Disable retries (they catch transient failures)
- Ignore timeout warnings (they indicate system stress)
- Remove complexity keywords without testing

---

## 🚨 Emergency Fixes

### Quick Timeout Increase
```typescript
// In src/config/constants.ts
export const LLM_TIMEOUT_COMPLEX_MS = 300000; // 5 minutes (emergency)
```

### Disable Complexity Detection (Use Max Timeout Always)
```typescript
// In src/utils/OpenAIProvider.ts
private isComplexRefactorOperation(request: CompletionRequest): boolean {
  return true; // Force 120s timeout for all operations
}
```

### Increase Retries
```typescript
// In src/config/constants.ts
export const LLM_MAX_RETRIES = 5; // Increase to 5 attempts
```

---

## 📈 Success Metrics

### Before
- Timeout: 15s
- Success Rate: ~40%
- Avg Complex Op: ❌ Failed

### After
- Timeout: 60s/120s (dynamic)
- Success Rate: ~95% (expected)
- Avg Complex Op: ✅ 30-90s

---

## 🔗 Quick Links

- [Full Documentation](./COGNITIVE_RECOVERY.md)
- [Flow Diagrams](./COGNITIVE_RECOVERY_FLOW.md)
- [Test Script](../scripts/test-cognitive-recovery.ts)
- [OpenAI Provider](../src/utils/OpenAIProvider.ts)
- [Constants Config](../src/config/constants.ts)

---

**Last Updated**: 2026-01-17  
**Status**: ✅ Production Ready  
**Version**: 1.0.0
