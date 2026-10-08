import com.android.apksig.ApkVerifier;
import java.io.File;
import java.security.MessageDigest;
import java.security.cert.X509Certificate;
import java.util.*;

/**
 * Verifies an APK signature with Google's apksig (bundled inside the jadx jar) and prints JSON in the shape
 * the Info panel reads. Compiled class is checked in: `javac --release 17 -cp <jadx-all.jar> -d proxy/apk proxy/apk/Verify.java`.
 */
public class Verify {
  static String q(String s) {
    StringBuilder b = new StringBuilder("\"");
    for (char c : String.valueOf(s).toCharArray()) {
      if (c == '"' || c == '\\') b.append('\\').append(c);
      else if (c < 32) b.append(String.format("\\u%04x", (int) c));
      else b.append(c);
    }
    return b.append('"').toString();
  }

  static String hex(byte[] d) { StringBuilder b = new StringBuilder(); for (byte x : d) b.append(String.format("%02x", x)); return b.toString(); }

  static String arr(List<String> l) { StringJoiner j = new StringJoiner(",", "[", "]"); for (String s : l) j.add(q(s)); return j.toString(); }

  static String cert(X509Certificate c, String scheme) throws Exception {
    return "{\"subject\":" + q(c.getSubjectX500Principal().getName()) + ",\"issuer\":" + q(c.getIssuerX500Principal().getName())
      + ",\"sha256\":" + q(hex(MessageDigest.getInstance("SHA-256").digest(c.getEncoded())))
      + ",\"validFrom\":" + q(c.getNotBefore().toInstant().toString()) + ",\"validTo\":" + q(c.getNotAfter().toInstant().toString())
      + ",\"key\":" + q(c.getPublicKey().getAlgorithm()) + ",\"scheme\":" + q(scheme) + "}";
  }

  static List<String> issues(List<ApkVerifier.IssueWithParams> l) { List<String> o = new ArrayList<>(); for (var i : l) o.add(i.toString()); return o; }

  static String scheme(boolean verified, List<X509Certificate> certs, List<String> errors, String name, Set<String> seen, List<String> signers) throws Exception {
    boolean present = !certs.isEmpty() || !errors.isEmpty();
    if (!present) return null;
    for (X509Certificate c : certs) {
      String j = cert(c, name);
      String id = hex(MessageDigest.getInstance("SHA-256").digest(c.getEncoded()));
      if (seen.add(id)) signers.add(j);
    }
    return "{\"present\":true,\"verified\":" + verified + ",\"errors\":" + arr(errors) + "}";
  }

  public static void main(String[] a) throws Exception {
    ApkVerifier.Builder vb = new ApkVerifier.Builder(new File(a[0]));
    if (a.length > 1) vb.setMinCheckedPlatformVersion(Integer.parseInt(a[1]));   // optional: override the manifest's minSdkVersion (the tests' fixtures declare 15)
    ApkVerifier.Result r = vb.build().verify();
    List<String> signers = new ArrayList<>();
    Set<String> seen = new HashSet<>();
    Map<String, String> schemes = new LinkedHashMap<>();
    List<String> warnings = new ArrayList<>(issues(r.getWarnings()));

    List<X509Certificate> c3 = new ArrayList<>(), c31 = new ArrayList<>(), c2 = new ArrayList<>(), c1 = new ArrayList<>();
    List<String> e3 = new ArrayList<>(), e31 = new ArrayList<>(), e2 = new ArrayList<>(), e1 = new ArrayList<>();
    for (var s : r.getV31SchemeSigners()) { if (s.getCertificate() != null) c31.add(s.getCertificate()); e31.addAll(issues(s.getErrors())); warnings.addAll(issues(s.getWarnings())); }
    for (var s : r.getV3SchemeSigners()) { if (s.getCertificate() != null) c3.add(s.getCertificate()); e3.addAll(issues(s.getErrors())); warnings.addAll(issues(s.getWarnings())); }
    for (var s : r.getV2SchemeSigners()) { if (s.getCertificate() != null) c2.add(s.getCertificate()); e2.addAll(issues(s.getErrors())); warnings.addAll(issues(s.getWarnings())); }
    for (var s : r.getV1SchemeSigners()) { if (s.getCertificate() != null) c1.add(s.getCertificate()); e1.addAll(issues(s.getErrors())); warnings.addAll(issues(s.getWarnings())); }
    // Errors that belong to no signer (a bad signing block, for example) are shown on the overall verdict.
    List<String> general = issues(r.getErrors());

    String s;
    if ((s = scheme(r.isVerifiedUsingV31Scheme(), c31, e31, "v3.1", seen, signers)) != null) schemes.put("v3.1", s);
    if ((s = scheme(r.isVerifiedUsingV3Scheme(), c3, e3, "v3", seen, signers)) != null) schemes.put("v3", s);
    if ((s = scheme(r.isVerifiedUsingV2Scheme(), c2, e2, "v2", seen, signers)) != null) schemes.put("v2", s);
    if ((s = scheme(r.isVerifiedUsingV1Scheme(), c1, e1, "v1", seen, signers)) != null) schemes.put("v1", s);
    if (schemes.isEmpty()) warnings.add("no APK signature found (unsigned)");

    StringJoiner sc = new StringJoiner(",", "{", "}");
    for (var e : schemes.entrySet()) sc.add(q(e.getKey()) + ":" + e.getValue());
    sc.add("\"v4\":{\"present\":false,\"note\":\"v4 uses a separate .idsig file, not checked\"}");
    StringJoiner sg = new StringJoiner(",", "[", "]");
    for (String x : signers) sg.add(x);
    System.out.println("{\"verified\":" + r.isVerified() + ",\"schemes\":" + sc + ",\"signers\":" + sg + ",\"errors\":" + arr(general) + ",\"warnings\":" + arr(warnings) + "}");
  }
}
