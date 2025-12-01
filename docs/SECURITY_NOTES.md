# Security Notes

## Known Vulnerabilities

### xlsx Package
The `xlsx` package has known vulnerabilities:
- **Prototype Pollution** (GHSA-4r6h-8v6p-xvw6)
- **Regular Expression Denial of Service (ReDoS)** (GHSA-5pgg-2g8v-p4x9)

**Status**: No fix available from the package maintainer

**Mitigation**:
- The `xlsx` package is only used for reading Excel master data files during development
- It is NOT used in production runtime
- Excel files are converted to JSON during build time
- Consider migrating to a different Excel parsing library in the future

**Recommendation**: 
- Monitor for updates to `xlsx` package
- Consider alternatives like `exceljs` or `node-xlsx` for future versions
- Ensure Excel files are from trusted sources only

### pdfmake-lite
**Status**: Removed from dependencies

**Action Taken**: 
- Removed `pdfmake-lite` package
- Using only `pdfmake` which is actively maintained

### glob Package
**Status**: Updated to latest version

**Action Taken**: 
- Updated `glob` to latest version via `npm update glob`

## Security Best Practices

1. **Regular Updates**: Run `npm audit` regularly and update dependencies
2. **Environment Variables**: Never commit `.env.local` files
3. **Password Storage**: Passwords are stored in plain text (as per requirements)
4. **API Security**: All API routes validate user authentication
5. **Input Validation**: All user inputs are validated and sanitized

## Monitoring

Run these commands regularly:
```bash
npm audit
npm outdated
npm update
```

## Future Improvements

- [ ] Migrate from `xlsx` to a more secure alternative
- [ ] Implement proper password hashing (if requirements change)
- [ ] Add rate limiting to API routes
- [ ] Implement CSRF protection
- [ ] Add input sanitization middleware

